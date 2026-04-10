import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/adminOnly.middleware.js";
import { getAdminAnalytics } from "../controllers/analytics.controller.js";

const router = Router();

router.get("/admin", protect, adminOnly, getAdminAnalytics);

export default router;
