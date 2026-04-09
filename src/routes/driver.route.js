import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { updateDriverLocation } from "../controllers/driver.controller.js";

const router = Router();

router.post("/location", protect, updateDriverLocation);

export default router;