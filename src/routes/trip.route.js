// routes/trip.route.js
import { Router } from "express";
import { confirmTripFromEstimate } from "../controllers/trip.controller.js";

// If you already have an auth middleware, import it and use it here.
// Example: import requireAuth from "../middleware/requireAuth.js";

const router = Router();

// router.post("/", requireAuth, confirmTripFromEstimate);
router.post("/", confirmTripFromEstimate);

export default router;
