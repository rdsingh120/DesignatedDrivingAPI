// src/models/LocationUpdate.model.js
import mongoose from "mongoose";
import { GEO } from "./constants.js";

const { Schema } = mongoose;

function isValidLat(v) {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v) {
  return typeof v === "number" && v >= -180 && v <= 180;
}

const LocationUpdateSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    driverProfile: { type: Schema.Types.ObjectId, ref: "DriverProfile", required: true, index: true },

    latitude: { type: Number, required: true, validate: [isValidLat, "Invalid latitude"] },
    longitude: { type: Number, required: true, validate: [isValidLng, "Invalid longitude"] },

    geo: {
      type: { type: String, enum: [GEO.POINT], default: GEO.POINT },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    heading: { type: Number, min: 0, max: 360 },
    speed_kph: { type: Number, min: 0 },

    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

LocationUpdateSchema.pre("validate", function (next) {
  if (isValidLat(this.latitude) && isValidLng(this.longitude)) {
    this.geo = { type: GEO.POINT, coordinates: [this.longitude, this.latitude] };
  }
  next();
});

LocationUpdateSchema.index({ geo: "2dsphere" });
LocationUpdateSchema.index({ trip: 1, recordedAt: -1 });

export default mongoose.model("LocationUpdate", LocationUpdateSchema);
