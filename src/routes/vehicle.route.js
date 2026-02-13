import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createVehicle,
  listMyVehicles,
  deactivateVehicle,
} from "../controllers/vehicle.controller.js";

const router = Router();

router.post("/", protect, createVehicle);
router.get("/mine", protect, listMyVehicles);
router.delete("/:id", protect, deactivateVehicle);

export default router;
