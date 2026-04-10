// src/routes/savedLocation.route.js
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMySavedLocations,
  createSavedLocation,
  updateSavedLocation,
} from "../controllers/savedLocation.controller.js";

const router = express.Router();

router.use(protect);

// /api/saved-locations/me
router.get("/me", getMySavedLocations);
router.post("/me", createSavedLocation);
router.put("/:id", updateSavedLocation);

export default router;
