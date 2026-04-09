import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
  streamNotifications,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/stream", streamNotifications); // no protect middleware — auth via query token
router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);

export default router;
