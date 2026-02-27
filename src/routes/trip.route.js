// routes/trip.route.js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { confirmTripFromEstimate, dispatchTrip , acceptTrip} from "../controllers/trip.controller.js";
import { arriveTrip, startTrip, completeTrip } from "../controllers/trip.controller.js";
import { getMyTrips, getTripById, getOpenTrips } from "../controllers/trip.read.controller.js";

// Example: import requireAuth from "../middleware/requireAuth.js";

const router = Router();


router.post("/", protect, confirmTripFromEstimate);
//router.post("/:id/dispatch", dispatchTrip); no longer in scope of this project, but could be added back in if we want dispatch functionality
router.post("/:id/arrive", protect, arriveTrip);
router.post("/:id/start", protect, startTrip);
router.post("/:id/complete", protect, completeTrip);
router.get("/mine", protect, getMyTrips);
router.get("/:id", protect, getTripById);

router.get("/open", protect, getOpenTrips);
router.post("/:id/accept", protect, acceptTrip);

export default router;
