// src/routes/estimate.routes.js
import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createEstimate } from "../controllers/estimate.controller.js";

const router = Router();

// add auth middleware: router.post("/", protect, createEstimate);
router.post("/", createEstimate);

export default router;
