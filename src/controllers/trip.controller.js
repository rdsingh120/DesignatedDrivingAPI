// controllers/trip.controller.js
import Estimate from "../models/Estimate.model.js";
import Trip from "../models/Trip.model.js";
import Vehicle from "../models/Vehicle.model.js";
import DriverProfile from "../models/DriverProfile.model.js";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.model.js";
import { getRouteOSRM } from "../services/osrm.service.js";
import { USER_ROLES } from "../models/constants.js";
import { TRIP_STATUS, DRIVER_VERIFICATION_STATUS, DRIVER_AVAILABILITY } from "../models/constants.js";


// --- helpers ---
async function getMyDriverProfile(req) {
  const userId = req.user?._id;
  if (!userId) return null;
  return DriverProfile.findOne({ user: userId }).select("_id user activeTrip availability verificationStatus");
}

/**
 * POST /api/trips/:id/arrive
 * ASSIGNED -> ENROUTE
 * Driver-only, assigned driver only
 */
export async function arriveTrip(req, res) {
  const tripId = req.params.id;

  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });
    if ((req.user.role || "").toUpperCase() !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can update trip status" });
    }

    const me = await getMyDriverProfile(req);
    if (!me) return res.status(403).json({ error: "DriverProfile not found. Create profile first." });

    // Only assigned driver can move ASSIGNED -> ENROUTE
    const updated = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driverProfile: me._id,
        status: TRIP_STATUS.ASSIGNED,
      },
      {
        $set: { status: TRIP_STATUS.ENROUTE, arrivedAt: new Date() },
      },
      { new: true }
    );

    if (!updated) {
      // Could be: trip not found, not assigned to you, or wrong state
      const exists = await Trip.findById(tripId).select("_id status driverProfile");
      if (!exists) return res.status(404).json({ error: "Trip not found" });
      if (String(exists.driverProfile || "") !== String(me._id)) {
        return res.status(403).json({ error: "You are not the assigned driver for this trip" });
      }
      return res.status(400).json({ error: `Trip must be ${TRIP_STATUS.ASSIGNED} to arrive` });
    }

    // Notify the rider that the driver has arrived
    Notification.create({
      user: updated.rider,
      trip: updated._id,
      type: NOTIFICATION_TYPES.DRIVER_ARRIVED,
      title: "Driver Arrived",
      message: "Your driver has arrived at the pickup location. Please head outside!",
    }).catch((err) => console.error("Failed to create DRIVER_ARRIVED notification:", err));

    return res.status(200).json({ success: true, trip: updated });
  } catch (err) {
    console.error("arriveTrip error:", err);
    return res.status(500).json({ error: "Server error updating trip (arrive)" });
  }
}

/**
 * POST /api/trips/:id/start
 * ENROUTE -> DRIVING
 * Driver-only, assigned driver only
 */
export async function startTrip(req, res) {
  const tripId = req.params.id;

  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });
    if ((req.user.role || "").toUpperCase() !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can update trip status" });
    }

    const me = await getMyDriverProfile(req);
    if (!me) return res.status(403).json({ error: "DriverProfile not found. Create profile first." });

    const updated = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driverProfile: me._id,
        status: TRIP_STATUS.ENROUTE,
      },
      {
        $set: {
          status: TRIP_STATUS.DRIVING,
          startedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      const exists = await Trip.findById(tripId).select("_id status driverProfile");
      if (!exists) return res.status(404).json({ error: "Trip not found" });
      if (String(exists.driverProfile || "") !== String(me._id)) {
        return res.status(403).json({ error: "You are not the assigned driver for this trip" });
      }
      return res.status(400).json({ error: `Trip must be ${TRIP_STATUS.ENROUTE} to start` });
    }

    return res.status(200).json({ success: true, trip: updated });
  } catch (err) {
    console.error("startTrip error:", err);
    return res.status(500).json({ error: "Server error updating trip (start)" });
  }
}

/**
 * POST /api/trips/:id/complete
 * DRIVING -> COMPLETED
 * Driver-only, assigned driver only
 * Also releases driver: BUSY -> AVAILABLE, activeTrip -> null
 */
export async function completeTrip(req, res) {
  const tripId = req.params.id;

  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });
    if ((req.user.role || "").toUpperCase() !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can update trip status" });
    }

    const me = await getMyDriverProfile(req);
    if (!me) return res.status(403).json({ error: "DriverProfile not found. Create profile first." });

    // 1) Complete the trip (guarded)
    const completed = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driverProfile: me._id,
        status: TRIP_STATUS.DRIVING,
      },
      {
        $set: {
          status: TRIP_STATUS.COMPLETED,
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!completed) {
      const exists = await Trip.findById(tripId).select("_id status driverProfile");
      if (!exists) return res.status(404).json({ error: "Trip not found" });
      if (String(exists.driverProfile || "") !== String(me._id)) {
        return res.status(403).json({ error: "You are not the assigned driver for this trip" });
      }
      return res.status(400).json({ error: `Trip must be ${TRIP_STATUS.DRIVING} to complete` });
    }

    // 2) Release driver (best-effort, guarded)
    await DriverProfile.updateOne(
      { _id: me._id, activeTrip: completed._id },
      { $set: { availability: DRIVER_AVAILABILITY.AVAILABLE, activeTrip: null } }
    );

    // Notify the rider that the trip is complete and prompt for feedback
    Notification.create({
      user: completed.rider,
      trip: completed._id,
      type: NOTIFICATION_TYPES.TRIP_COMPLETED,
      title: "Trip Completed",
      message: "You've arrived! Please take a moment to rate your driver.",
    }).catch((err) => console.error("Failed to create TRIP_COMPLETED notification:", err));

    return res.status(200).json({
      success: true,
      message: "Trip completed successfully",
      trip: completed,
    });
  } catch (err) {
    console.error("completeTrip error:", err);
    return res.status(500).json({ error: "Server error updating trip (complete)" });
  }
}

/**
 * POST /api/trips/:id/accept
 * REQUESTED -> ASSIGNED
 * Driver-only, VERIFIED + AVAILABLE + no activeTrip
 * Atomic claim + concurrency safe
 */
export async function acceptTrip(req, res) {
  const tripId = req.params.id;

  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });
    if ((req.user.role || "").toUpperCase() !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can accept trips" });
    }

    const me = await getMyDriverProfile(req);
    if (!me) return res.status(403).json({ error: "DriverProfile not found. Create profile first." });

    // eligibility check (quick)
    if (me.verificationStatus !== DRIVER_VERIFICATION_STATUS.VERIFIED) {
      return res.status(403).json({ error: "Driver must be VERIFIED to accept trips" });
    }
    if (me.availability !== DRIVER_AVAILABILITY.AVAILABLE) {
      return res.status(409).json({ error: "Driver must be AVAILABLE to accept trips" });
    }
    if (me.activeTrip) {
      return res.status(409).json({ error: "Driver already has an active trip" });
    }

    // 1) Atomically assign the trip to this driver (only if still open)
    const assignedTrip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        status: TRIP_STATUS.REQUESTED,
        $or: [{ driverProfile: { $exists: false } }, { driverProfile: null }],
      },
      {
        $set: {
          driverProfile: me._id,
          status: TRIP_STATUS.ASSIGNED,
          assignedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!assignedTrip) {
      return res.status(409).json({ error: "Trip already taken or not open" });
    }

    // 2) Lock driver as BUSY + set activeTrip (guarded)
    const updatedDriver = await DriverProfile.findOneAndUpdate(
      {
        _id: me._id,
        verificationStatus: DRIVER_VERIFICATION_STATUS.VERIFIED,
        availability: DRIVER_AVAILABILITY.AVAILABLE,
        $or: [{ activeTrip: { $exists: false } }, { activeTrip: null }],
      },
      { $set: { availability: DRIVER_AVAILABILITY.BUSY, activeTrip: assignedTrip._id } },
      { new: true }
    );

    // Calculate route details (e.g., ETA, distance)
    try {
      if (
        updatedDriver.current_location?.coordinates?.length === 2 &&
        assignedTrip.pickup_latitude &&
        assignedTrip.pickup_longitude
      ) {
        const [driverLng, driverLat] = updatedDriver.current_location.coordinates;

        const route = await getRouteOSRM({
          pickup: { lat: driverLat, lng: driverLng },
          dropoff: {
            lat: assignedTrip.pickup_latitude,
            lng: assignedTrip.pickup_longitude,
          },
        });

        const driverDistanceKm = route.distance_m / 1000;
        const driverEtaMinutes = route.duration_s / 60;

        await Trip.updateOne(
          { _id: assignedTrip._id },
          {
            $set: {
              driver_eta_minutes: driverEtaMinutes,
              driver_distance_km: driverDistanceKm,
              driver_route_polyline: route.polyline || null,
            },
          }
        );

        assignedTrip.driver_eta_minutes = driverEtaMinutes;
        assignedTrip.driver_distance_km = driverDistanceKm;
        assignedTrip.driver_route_polyline = route.polyline || null;
      }
    } catch (err) {
      console.error("driver ETA calculation failed:", err);
    }

    if (!updatedDriver) {
      // rollback trip assignment if driver couldn’t be locked (rare but possible)
      await Trip.updateOne(
        { _id: assignedTrip._id, driverProfile: me._id, status: TRIP_STATUS.ASSIGNED },
        { $set: { driverProfile: null, status: TRIP_STATUS.REQUESTED }, $unset: { assignedAt: "" } }
      );

      return res.status(409).json({ error: "Could not claim trip (driver state changed). Try again." });
    }

    // Notify the rider that a driver has accepted their request
    Notification.create({
      user: assignedTrip.rider,
      trip: assignedTrip._id,
      type: NOTIFICATION_TYPES.TRIP_ACCEPTED,
      title: "Driver Accepted",
      message: "A driver has accepted your trip request and is on the way to pick you up!",
    }).catch((err) => console.error("Failed to create TRIP_ACCEPTED notification:", err));

    return res.status(200).json({
      success: true,
      message: "Trip accepted successfully",
      trip: assignedTrip,
      driverProfile: updatedDriver,
    });
  } catch (err) {
    // If the partial unique index triggers (one active trip per driver), this catches it too.
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Driver already has an active trip" });
    }
    console.error("acceptTrip error:", err);
    return res.status(500).json({ error: "Server error accepting trip" });
  }
}

/**
 * POST /api/trips/:id/cancel
 * Driver: ASSIGNED | ENROUTE -> REQUESTED (returns to marketplace)
 * Rider:  REQUESTED -> CANCELLED (no fee) | ASSIGNED -> CANCELLED (fee applies)
 */
export async function cancelTrip(req, res) {
  const tripId = req.params.id;
  const role = (req.user?.role || "").toUpperCase();

  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    // --- Rider cancel ---
    if (role === USER_ROLES.RIDER) {
      const trip = await Trip.findById(tripId).select("_id status rider driverProfile");
      if (!trip) return res.status(404).json({ error: "Trip not found" });
      if (String(trip.rider) !== String(req.user._id)) {
        return res.status(403).json({ error: "This is not your trip" });
      }

      const cancellable = [TRIP_STATUS.REQUESTED, TRIP_STATUS.ASSIGNED];
      if (!cancellable.includes(trip.status)) {
        return res.status(400).json({ error: "Trip cannot be cancelled at this stage" });
      }

      const cancelled = await Trip.findByIdAndUpdate(
        tripId,
        { $set: { status: TRIP_STATUS.CANCELLED, cancelledAt: new Date() } },
        { new: true }
      );

      // Release driver if one was assigned
      if (trip.driverProfile) {
        await DriverProfile.updateOne(
          { _id: trip.driverProfile, activeTrip: trip._id },
          { $set: { availability: DRIVER_AVAILABILITY.AVAILABLE, activeTrip: null } }
        );
      }

      return res.status(200).json({ success: true, trip: cancelled });
    }

    // --- Driver cancel ---
    if (role === USER_ROLES.DRIVER) {
      const me = await getMyDriverProfile(req);
      if (!me) return res.status(403).json({ error: "DriverProfile not found. Create profile first." });

      const cancellableStatuses = [TRIP_STATUS.ASSIGNED, TRIP_STATUS.ENROUTE];

      // Return trip to REQUESTED so another driver can pick it up
      const released = await Trip.findOneAndUpdate(
        { _id: tripId, driverProfile: me._id, status: { $in: cancellableStatuses } },
        { $set: { status: TRIP_STATUS.REQUESTED }, $unset: { driverProfile: "", assignedAt: "" } },
        { new: true }
      );

      if (!released) {
        const exists = await Trip.findById(tripId).select("_id status driverProfile");
        if (!exists) return res.status(404).json({ error: "Trip not found" });
        if (String(exists.driverProfile || "") !== String(me._id)) {
          return res.status(403).json({ error: "You are not the assigned driver for this trip" });
        }
        return res.status(400).json({ error: "Trip cannot be cancelled from its current status" });
      }

      await DriverProfile.updateOne(
        { _id: me._id, activeTrip: released._id },
        { $set: { availability: DRIVER_AVAILABILITY.AVAILABLE, activeTrip: null } }
      );

      // Notify the rider that the driver cancelled
      Notification.create({
        user: released.rider,
        trip: released._id,
        type: NOTIFICATION_TYPES.TRIP_CANCELLED,
        title: "Driver Cancelled",
        message: "Your driver has cancelled the trip. We're finding you a new driver.",
      }).catch((err) => console.error("Failed to create TRIP_CANCELLED notification:", err));

      return res.status(200).json({ success: true, trip: released });
    }

    return res.status(403).json({ error: "Unauthorized role" });
  } catch (err) {
    console.error("cancelTrip error:", err);
    return res.status(500).json({ error: "Server error cancelling trip" });
  }
}

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

    pickup_address: estimate.pickup_address || undefined,
    dropoff_address: estimate.dropoff_address || undefined,
    pickup_display_address: estimate.pickup_display_address || undefined,
    dropoff_display_address: estimate.dropoff_display_address || undefined,
    geocode_provider: estimate.geocode_provider || undefined,
    geocode_base_url: estimate.geocode_base_url || undefined,

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
        $or: [{ driverProfile: { $exists: false } }, { driverProfile: null }], // guard
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