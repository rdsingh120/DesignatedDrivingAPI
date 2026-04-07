// src/controllers/driverProfile.controller.js
import DriverProfile from "../models/DriverProfile.model.js";
import {
  USER_ROLES,
  DRIVER_VERIFICATION_STATUS,
  DRIVER_AVAILABILITY,
} from "../models/constants.js";

/**
 * POST /api/driver-profiles/me
 * Create driver profile for logged-in driver
 */
export const createMyDriverProfile = async (req, res) => {
    console.log("AUTH USER:", req.user);
    console.log("ROLE:", req.user?.role);
    try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can create a driver profile" });
    }

    // Check if profile already exists (idempotent behavior)
    const existing = await DriverProfile.findOne({ user: userId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Driver profile already exists",
        driverProfile: existing,
      });
    }

    const profile = await DriverProfile.create({
      user: userId,
    });

    return res.status(201).json({
      success: true,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("createMyDriverProfile error:", err);
    return res.status(500).json({ error: "Server error creating driver profile" });
  }
};

/**
 * GET /api/driver-profiles/me
 * Get current driver's profile
 */
export const getMyDriverProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await DriverProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    return res.status(200).json({
      success: true,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("getMyDriverProfile error:", err);
    return res.status(500).json({ error: "Server error retrieving driver profile" });
  }
};

/**
 * PATCH /api/driver-profiles/me/status
 * Update verificationStatus and availability
 */
export const updateMyDriverStatus = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can update driver status" });
    }

    const { verificationStatus, availability } = req.body || {};

    const profile = await DriverProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found. Create profile first." });
    }

    // Validate enums if provided
    if (verificationStatus) {
      if (!Object.values(DRIVER_VERIFICATION_STATUS).includes(verificationStatus)) {
        return res.status(400).json({ error: "Invalid verificationStatus value" });
      }
      profile.verificationStatus = verificationStatus;
    }

    if (availability) {
      if (!Object.values(DRIVER_AVAILABILITY).includes(availability)) {
        return res.status(400).json({ error: "Invalid availability value" });
      }

      // Prevent marking AVAILABLE while already assigned
      if (
        availability === DRIVER_AVAILABILITY.AVAILABLE &&
        profile.activeTrip
      ) {
        return res.status(400).json({
          error: "Cannot set AVAILABLE while assigned to an active trip",
        });
      }

      profile.availability = availability;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("updateMyDriverStatus error:", err);
    return res.status(500).json({ error: "Server error updating driver status" });
  }
};

/**
 * PATCH /api/driver-profiles/me/location
 * Update current driver's live location
 */
export const updateMyDriverLocation = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role !== USER_ROLES.DRIVER) {
      return res.status(403).json({ error: "Only drivers can update live location" });
    }

    const { latitude, longitude } = req.body || {};

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required" });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Latitude must be between -90 and 90" });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Longitude must be between -180 and 180" });
    }

    const profile = await DriverProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found. Create profile first." });
    }

    // Only allow location tracking while driver is on an active trip
    if (!profile.activeTrip) {
      return res.status(400).json({
        error: "Location updates are only allowed while assigned to an active trip",
      });
    }

    profile.current_location = {
      type: "Point",
      coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
    };

    profile.location_updated_at = new Date();

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Driver location updated successfully",
      current_location: profile.current_location,
      location_updated_at: profile.location_updated_at,
    });
  } catch (err) {
    console.error("updateMyDriverLocation error:", err);
    return res.status(500).json({ error: "Server error updating driver location" });
  }
};