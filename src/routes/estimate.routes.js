// src/routes/estimate.routes.js
import { Router } from "express";
import { createEstimate } from "../controllers/estimate.controller.js";

const router = Router();

// Later add auth middleware: router.post("/", authRequired, createEstimate);
router.post("/", createEstimate);

export default router;
