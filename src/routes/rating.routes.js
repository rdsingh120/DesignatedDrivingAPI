import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";

import {
  createRating,
  getRatingsForUser,
  getRatingsForTrip
} from "../controllers/rating.controller.js";

const router = Router();

router.post("/", protect, createRating);

router.get("/user/:userId", getRatingsForUser);

router.get("/trip/:tripId", getRatingsForTrip);

export default router;