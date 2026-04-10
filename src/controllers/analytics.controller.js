import Trip from "../models/Trip.model.js";
import DriverProfile from "../models/DriverProfile.model.js";
import User from "../models/User.model.js";
import { TRIP_STATUS, DRIVER_AVAILABILITY } from "../models/constants.js";


export async function getAdminAnalytics(req, res) {
  try {
    const [
      totalTrips,
      completedTrips,
      pendingTrips,
      assignedTrips,
      activeDrivers,
      totalDrivers,
      totalRiders,
    ] = await Promise.all([
      Trip.countDocuments(),
      Trip.countDocuments({ status: TRIP_STATUS.COMPLETED }),
      Trip.countDocuments({ status: TRIP_STATUS.REQUESTED }),
      Trip.countDocuments({ status: TRIP_STATUS.ASSIGNED }),
      DriverProfile.countDocuments({
        availability: { $in: [DRIVER_AVAILABILITY.AVAILABLE, DRIVER_AVAILABILITY.BUSY] },
      }),
      DriverProfile.countDocuments(),
      User.countDocuments({ role: "RIDER" }),
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        totalTrips,
        completedTrips,
        pendingTrips,
        assignedTrips,
        activeDrivers,
        totalDrivers,
        totalRiders,
      },
    });
  } catch (err) {
    console.error("getAdminAnalytics error:", err);
    return res.status(500).json({ message: "Server error fetching analytics" });
  }
}
