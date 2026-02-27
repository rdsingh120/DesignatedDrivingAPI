// src/controllers/trip.read.controller.js
import Trip from "../models/Trip.model.js";
import DriverProfile from "../models/DriverProfile.model.js";
import { USER_ROLES } from "../models/constants.js";
import { TRIP_STATUS } from "../models/constants.js";

async function getMyDriverProfile(req) {
  const userId = req.user?._id;
  if (!userId) return null;
  return DriverProfile.findOne({ user: userId }).select("_id user");
}

/**
 * Safe fields to return
 */
function safeTripSelect() {
  return [
    "rider",
    "driverProfile",
    "vehicle",
    "status",
    "pickup_latitude",
    "pickup_longitude",
    "dropoff_latitude",
    "dropoff_longitude",
    "pickup_geo",
    "dropoff_geo",
    "distance_km",
    "duration_minutes",
    "route_polyline",
    "fare_amount",
    "currency",
    "requestedAt",
    "assignedAt",
    "startedAt",
    "completedAt",
    "cancelledAt",
    "cancelReason",
    "payment",
    "rating",
    "createdAt",
    "updatedAt",
  ].join(" ");
}

/**
 * Populate minimal safe info
 */
function tripPopulate() {
  return [
    { path: "rider", select: "_id name" },

    {
      path: "driverProfile",
      select: "_id availability verificationStatus user",
      populate: { path: "user", select: "_id name" },
    },

    {
      path: "vehicle",
      select: "_id make model year color plateNumber owner",
    },
  ];
}

/**
 * GET /api/trips/open
 * Driver marketplace: list REQUESTED trips not yet assigned
 * Driver-only
 */
export async function getOpenTrips(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    const role = (req.user.role || "").toUpperCase();
    if (role !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can view open trips" });
    }

    const trips = await Trip.find({
      status: TRIP_STATUS.REQUESTED,
      $or: [{ driverProfile: { $exists: false } }, { driverProfile: null }],
    })
      .select(safeTripSelect())
      .populate(tripPopulate())
      .sort({ requestedAt: -1 })
      .limit(50);

    const output = trips.map((t) => {
      const obj = t.toObject();
      if (obj.vehicle) delete obj.vehicle.owner; // don’t leak owner to drivers
      return obj;
    });

    return res.status(200).json({ success: true, count: output.length, trips: output });
  } catch (err) {
    console.error("getOpenTrips error:", err);
    return res.status(500).json({ error: "Server error fetching open trips" });
  }
}

/**
 * GET /api/trips/:id
 */
export async function getTripById(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    const role = (req.user.role || "").toUpperCase();
    const userId = String(req.user._id);
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId)
      .select(safeTripSelect())
      .populate(tripPopulate());

    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Admin can view anything
    if (role === USER_ROLES.ADMIN) {
      return res.status(200).json({ success: true, trip });
    }

    const isRider = String(trip.rider?._id || trip.rider) === userId;

    let isAssignedDriver = false;
    if (role === USER_ROLES.DRIVER) {
      const me = await getMyDriverProfile(req);
      if (me && trip.driverProfile && String(trip.driverProfile._id) === String(me._id)) {
        isAssignedDriver = true;
      }
    }

    if (!isRider && !isAssignedDriver) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const out = trip.toObject();

    // Hide vehicle.owner from drivers
    if (role === USER_ROLES.DRIVER && out.vehicle) {
      delete out.vehicle.owner;
    }

    return res.status(200).json({ success: true, trip: out });
  } catch (err) {
    console.error("getTripById error:", err);
    return res.status(500).json({ error: "Server error fetching trip" });
  }
}

/**
 * GET /api/trips/mine
 */
export async function getMyTrips(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    const role = (req.user.role || "").toUpperCase();

    let filter = {};

    if (role === USER_ROLES.RIDER) {
      filter = { rider: req.user._id };
    } else if (role === USER_ROLES.DRIVER) {
      const me = await getMyDriverProfile(req);
      if (!me) return res.status(403).json({ error: "DriverProfile not found" });
      filter = { driverProfile: me._id };
    } else if (role === USER_ROLES.ADMIN) {
      filter = {};
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    const trips = await Trip.find(filter)
      .select(safeTripSelect())
      .populate(tripPopulate())
      .sort({ createdAt: -1 })
      .limit(50);

    const output = trips.map((t) => {
      const obj = t.toObject();
      if (role === USER_ROLES.DRIVER && obj.vehicle) delete obj.vehicle.owner;
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: output.length,
      trips: output,
    });
  } catch (err) {
    console.error("getMyTrips error:", err);
    return res.status(500).json({ error: "Server error fetching trips" });
  }
}