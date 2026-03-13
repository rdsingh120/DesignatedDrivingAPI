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
 * PATCH /api/driver-profiles/me
 * Update driver profile information
 */
export const updateMyDriverProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await DriverProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    const { licenseNumber, licenseExpiry, phoneNumber, dateOfBirth, address, profilePhoto } =
      req.body || {};

    if (licenseNumber) profile.licenseNumber = licenseNumber;
    if (licenseExpiry) profile.licenseExpiry = licenseExpiry;
    if (phoneNumber) profile.phoneNumber = phoneNumber;
    if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
    if (profilePhoto) profile.profilePhoto = profilePhoto;

    if (address) {
      profile.address = { ...profile.address, ...address };
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("updateMyDriverProfile error:", err);
    return res.status(500).json({ error: "Server error updating driver profile" });
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
      if (availability === DRIVER_AVAILABILITY.AVAILABLE && profile.activeTrip) {
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
 * GET /api/driver-profiles/all
 * Admin only — list all driver profiles
 */
export const getAllDriverProfiles = async (req, res) => {
  try {
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ error: "Admin only" });
    }

    const profiles = await DriverProfile.find()
      .populate("user", "_id name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, driverProfiles: profiles });
  } catch (err) {
    console.error("getAllDriverProfiles error:", err);
    return res.status(500).json({ error: "Server error fetching driver profiles" });
  }
};

/**
 * PATCH /api/driver-profiles/:id/verify
 * Admin only — set verificationStatus on any driver profile
 */
export const verifyDriverProfile = async (req, res) => {
  try {
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { verificationStatus } = req.body || {};

    if (!Object.values(DRIVER_VERIFICATION_STATUS).includes(verificationStatus)) {
      return res.status(400).json({ error: "Invalid verificationStatus value" });
    }

    const profile = await DriverProfile.findById(req.params.id).populate(
      "user",
      "_id name email"
    );

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    profile.verificationStatus = verificationStatus;

    await profile.save();

    return res.status(200).json({
      success: true,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("verifyDriverProfile error:", err);
    return res.status(500).json({ error: "Server error verifying driver profile" });
  }
};

/**
 * POST /api/driver-profiles/me/photo
 * Upload driver profile photo
 */
export const uploadDriverPhoto = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const profile = await DriverProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    profile.profilePhoto = `/uploads/${req.file.filename}`;

    await profile.save();

    return res.status(200).json({
      success: true,
      profilePhoto: profile.profilePhoto,
      driverProfile: profile,
    });
  } catch (err) {
    console.error("uploadDriverPhoto error:", err);
    return res.status(500).json({ error: "Server error uploading photo" });
  }
};