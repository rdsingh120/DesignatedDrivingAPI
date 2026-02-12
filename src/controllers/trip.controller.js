// controllers/trip.controller.js
import Estimate from "../models/Estimate.model.js";
import Trip from "../models/Trip.model.js";
import Vehicle from "../models/Vehicle.model.js";
import { TRIP_STATUS } from "../models/constants.js";

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
