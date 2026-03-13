// src/routes/driverProfile.route.js
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getAllDriverProfiles, verifyDriverProfile } from "../controllers/driverProfile.controller.js";
import {
  createMyDriverProfile,
  getMyDriverProfile,
  updateMyDriverStatus,
  updateMyDriverProfile
} from "../controllers/driverProfile.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post("/me", createMyDriverProfile);
router.get("/me", getMyDriverProfile);
router.patch("/me/status", updateMyDriverStatus);
router.patch("/me", updateMyDriverProfile);

router.get("/all", getAllDriverProfiles);
router.patch("/:id/verify", verifyDriverProfile);

export default router;