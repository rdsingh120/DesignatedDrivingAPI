// routes/trip.route.js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { confirmTripFromEstimate, dispatchTrip } from "../controllers/trip.controller.js";
import { arriveTrip, startTrip, completeTrip } from "../controllers/trip.controller.js";
import { getMyTrips, getTripById } from "../controllers/trip.read.controller.js";

// If you already have an auth middleware, import it and use it here.
// Example: import requireAuth from "../middleware/requireAuth.js";

const router = Router();


router.post("/", protect, confirmTripFromEstimate);
router.post("/:id/dispatch", dispatchTrip);
router.post("/:id/arrive", protect, arriveTrip);
router.post("/:id/start", protect, startTrip);
router.post("/:id/complete", protect, completeTrip);
router.get("/mine", protect, getMyTrips);
router.get("/:id", protect, getTripById);

export default router;
