// src/models/Trip.model.js
import mongoose from "mongoose";
import { GEO, TRIP_STATUS } from "./constants.js";

const { Schema } = mongoose;

function isValidLat(v) {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v) {
  return typeof v === "number" && v >= -180 && v <= 180;
}

const TripSchema = new Schema(
  {
    rider: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    driverProfile: { type: Schema.Types.ObjectId, ref: "DriverProfile"},
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },

    status: {
      type: String,
      enum: Object.values(TRIP_STATUS),
      default: TRIP_STATUS.REQUESTED,
      index: true,
    },

    // lat/lng fields (as requested)
    pickup_latitude: { type: Number, required: true, validate: [isValidLat, "Invalid pickup latitude"] },
    pickup_longitude: { type: Number, required: true, validate: [isValidLng, "Invalid pickup longitude"] },
    dropoff_latitude: { type: Number, required: true, validate: [isValidLat, "Invalid dropoff latitude"] },
    dropoff_longitude: { type: Number, required: true, validate: [isValidLng, "Invalid dropoff longitude"] },

    // optional GeoJSON for geospatial queries
    pickup_geo: {
      type: { type: String, enum: [GEO.POINT], default: GEO.POINT },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    dropoff_geo: {
      type: { type: String, enum: [GEO.POINT], default: GEO.POINT },
      coordinates: { type: [Number], default: undefined },
    },

    distance_km: { type: Number, min: 0, default: 0 },
    duration_minutes: { type: Number, min: 0, default: 0 },
    route_polyline: { type: String, trim: true },

    // pricing
    fare_amount: { type: Number, min: 0, required: true },
    currency: { type: String, default: "CAD", uppercase: true, maxlength: 3 },

    requestedAt: { type: Date, default: Date.now, index: true },
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 300 },

    // convenience references (1:1 enforced via indexes in Payment/Rating)
    payment: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    rating: { type: Schema.Types.ObjectId, ref: "Rating", index: true },
  },
  { timestamps: true }
);

// Keep GeoJSON in sync with lat/lng
TripSchema.pre("validate", function (next) {
  if (isValidLat(this.pickup_latitude) && isValidLng(this.pickup_longitude)) {
    this.pickup_geo = { type: GEO.POINT, coordinates: [this.pickup_longitude, this.pickup_latitude] };
  }
  if (isValidLat(this.dropoff_latitude) && isValidLng(this.dropoff_longitude)) {
    this.dropoff_geo = { type: GEO.POINT, coordinates: [this.dropoff_longitude, this.dropoff_latitude] };
  }
  next();
});

// Geo indexes
TripSchema.index({ pickup_geo: "2dsphere" });
TripSchema.index({ dropoff_geo: "2dsphere" });

// Business rule: vehicle must belong to rider (enforce at service/controller level)
// Business rule: one active trip per driver -> partial unique index (driverProfile + active statuses)
TripSchema.index(
  { driverProfile: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: [TRIP_STATUS.ASSIGNED, TRIP_STATUS.ENROUTE, TRIP_STATUS.DRIVING] } },
  }
);

export default mongoose.model("Trip", TripSchema);
