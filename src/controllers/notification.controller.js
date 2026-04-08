import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { addConnection, removeConnection } from "../services/sse.service.js";

/**
 * GET /api/notifications
 * Returns the current user's notifications (newest first, last 50)
 */
export async function getMyNotifications(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n) => !n.read).length;

    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    return res.status(500).json({ error: "Server error fetching notifications" });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all of the current user's notifications as read
 */
export async function markAllAsRead(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({ error: "Server error marking notifications as read" });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read
 */
export async function markAsRead(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Unauthorized" });

    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Notification not found" });

    return res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ error: "Server error marking notification as read" });
  }
}

/**
 * GET /api/notifications/stream?token=<jwt>
 * Opens a persistent SSE connection for the authenticated user.
 * EventSource doesn't support headers, so the JWT is passed as a query param.
 */
export async function streamNotifications(req, res) {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id");
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send a heartbeat every 30s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      try { res.write(": heartbeat\n\n"); } catch (_) {}
    }, 30000);

    addConnection(user._id, res);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeConnection(user._id, res);
    });
  } catch (err) {
    console.error("streamNotifications error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
