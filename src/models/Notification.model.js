import mongoose from "mongoose";

export const NOTIFICATION_TYPES = {
  TRIP_ACCEPTED: "TRIP_ACCEPTED",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  TRIP_STARTED: "TRIP_STARTED",
  TRIP_COMPLETED: "TRIP_COMPLETED",
  TRIP_CANCELLED: "TRIP_CANCELLED",
};

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
