// controllers/trip.controller.js
import Estimate from "../models/Estimate.model.js";
import Trip from "../models/Trip.model.js";
import Vehicle from "../models/Vehicle.model.js";
import DriverProfile from "../models/DriverProfile.model.js";
import { TRIP_STATUS, DRIVER_VERIFICATION_STATUS, DRIVER_AVAILABILITY } from "../models/constants.js";

export async function confirmTripFromEstimate(req, res) {
  try {
    // Expect:
    // { estimateId: "...", vehicleId: "..." }
    const { estimateId, vehicleId } = req.body || {};

    if (!estimateId || !vehicleId) {
      return res.status(400).json({ error: "estimateId and vehicleId are required" });
    }

    // You should have req.user from auth middleware.
    // If you haven't wired auth yet, this will be undefined.
    const riderId = req.user?.id || req.user?._id;
    if (!riderId) {
      return res.status(401).json({ error: "Unauthorized (missing user). Add auth middleware to this route." });
    }

    // 1) Load estimate + validate expiry
    const estimate = await Estimate.findById(estimateId);
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });

    if (estimate.expiresAt && estimate.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Estimate expired. Please request a new estimate." });
    }

    // 2) Verify vehicle belongs to rider
    const vehicle = await Vehicle.findById(vehicleId).select("_id owner");
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    if (String(vehicle.owner) !== String(riderId)) {
      return res.status(403).json({ error: "Vehicle must belong to the rider" });
    }

    // 3) Create Trip from Estimate
    const trip = await Trip.create({
      rider: riderId,
      vehicle: vehicle._id,

      status: TRIP_STATUS.REQUESTED,

      pickup_latitude: estimate.pickup_latitude,
      pickup_longitude: estimate.pickup_longitude,
      dropoff_latitude: estimate.dropoff_latitude,
      dropoff_longitude: estimate.dropoff_longitude,

      distance_km: estimate.distance_km,
      duration_minutes: estimate.duration_minutes,
      route_polyline: estimate.route_polyline || null,

      fare_amount: estimate.fare_total,
      currency: estimate.currency || "CAD",

      requestedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      trip,
    });
  } catch (err) {
    console.error("confirmTripFromEstimate error:", err);
    return res.status(500).json({ error: "Server error creating trip" });
  }
}

export async function dispatchTrip(req, res) {
  const tripId = req.params.id;

  try {
    // 1) Load trip and validate state
    const trip = await Trip.findById(tripId).select("_id status driverProfile");
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (trip.status !== TRIP_STATUS.REQUESTED) {
      return res.status(400).json({ error: `Trip must be ${TRIP_STATUS.REQUESTED} to dispatch` });
    }
    if (trip.driverProfile) {
      return res.status(400).json({ error: "Trip already has a driver assigned" });
    }

    // 2) Claim a driver (atomic lock)
    // Only VERIFIED + AVAILABLE + not already on an active trip
    const claimedDriver = await DriverProfile.findOneAndUpdate(
      {
        verificationStatus: DRIVER_VERIFICATION_STATUS.VERIFIED,
        availability: DRIVER_AVAILABILITY.AVAILABLE,
        $or: [{ activeTrip: { $exists: false } }, { activeTrip: null }],
      },
      {
        $set: {
          availability: DRIVER_AVAILABILITY.BUSY,
          activeTrip: trip._id,
        },
      },
      {
        new: true,
        sort: { updatedAt: 1 }, // "oldest first" fairness (optional)
      }
    );

    if (!claimedDriver) {
      return res.status(409).json({ error: "No eligible drivers available" });
    }

    // 3) Assign trip to the claimed driver (atomic guard on trip state)
    const assignedTrip = await Trip.findOneAndUpdate(
      {
        _id: trip._id,
        status: TRIP_STATUS.REQUESTED,
        driverProfile: { $exists: false }, // guard
      },
      {
        $set: {
          driverProfile: claimedDriver._id,
          status: TRIP_STATUS.ASSIGNED,
          assignedAt: new Date(),
        },
      },
      { new: true }
    );

    // IMPORTANT: depending on how driverProfile field is defined, it might exist as null.
    // Add a second guard if your schema initializes it as null:
    // driverProfile: null

    if (!assignedTrip) {
      // 4) Rollback driver claim (trip got taken or changed state)
      await DriverProfile.updateOne(
        { _id: claimedDriver._id, activeTrip: trip._id },
        { $set: { availability: DRIVER_AVAILABILITY.AVAILABLE, activeTrip: null } }
      );

      return res.status(409).json({ error: "Trip could not be assigned (concurrent update). Try again." });
    }

    return res.status(200).json({
      success: true,
      message: "Trip dispatched successfully",
      trip: assignedTrip,
      driverProfile: claimedDriver,
    });
  } catch (err) {
    console.error("dispatchTrip error:", err);
    return res.status(500).json({ error: "Server error dispatching trip" });
  }
}