import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/adminOnly.middleware.js";
import {
  getAllIncidentReports,
  resolveIncidentReport,
} from "../controllers/incidentReport.controller.js";

const router = Router();

router.get("/", protect, adminOnly, getAllIncidentReports);

router.patch("/:id/resolve", protect, adminOnly, resolveIncidentReport);

export default router;
