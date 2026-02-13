// src/models/Estimate.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

function isValidLat(v) {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v) {
  return typeof v === "number" && v >= -180 && v <= 180;
}

const EstimateSchema = new Schema(
  {
    rider: { type: Schema.Types.ObjectId, ref: "User", index: true }, // optional pre-auth

    pickup_latitude: { type: Number, required: true, validate: [isValidLat, "Invalid pickup latitude"] },
    pickup_longitude: { type: Number, required: true, validate: [isValidLng, "Invalid pickup longitude"] },
    dropoff_latitude: { type: Number, required: true, validate: [isValidLat, "Invalid dropoff latitude"] },
    dropoff_longitude: { type: Number, required: true, validate: [isValidLng, "Invalid dropoff longitude"] },

    distance_km: { type: Number, required: true, min: 0 },
    duration_minutes: { type: Number, required: true, min: 0 },
    route_polyline: { type: String, trim: true },

    fare_total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "CAD", uppercase: true, maxlength: 3 },

    pricing_version: { type: String, required: true },
    fare_breakdown: { type: Schema.Types.Mixed },

    routing_provider: { type: String, default: "OSRM" },
    routing_base_url: { type: String },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: Mongo will auto-delete after expiresAt
EstimateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Estimate", EstimateSchema);