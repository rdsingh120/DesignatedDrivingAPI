// routes/trip.route.js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { confirmTripFromEstimate, acceptTrip } from "../controllers/trip.controller.js";
import { arriveTrip, startTrip, completeTrip, cancelTrip } from "../controllers/trip.controller.js";
import { getMyTrips, getTripById, getOpenTrips } from "../controllers/trip.read.controller.js";

const router = Router();

router.post("/", protect, confirmTripFromEstimate);

//  Marketplace routes"
router.get("/open", protect, getOpenTrips);
router.post("/:id/accept", protect, acceptTrip);

// Lifecycle
router.post("/:id/arrive", protect, arriveTrip);
router.post("/:id/start", protect, startTrip);
router.post("/:id/complete", protect, completeTrip);
router.post("/:id/cancel", protect, cancelTrip);

// Reads
router.get("/mine", protect, getMyTrips);
router.get("/:id", protect, getTripById);

export default router;