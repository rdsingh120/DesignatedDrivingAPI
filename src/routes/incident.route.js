import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createIncidentReport } from "../controllers/incident.controller.js";

const router = Router({ mergeParams: true });

// POST /api/trips/:id/report
router.post("/:id/report", protect, createIncidentReport);

export default router;
