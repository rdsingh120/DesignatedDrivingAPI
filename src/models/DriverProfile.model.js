// src/models/DriverProfile.model.js
import mongoose from "mongoose";
import { DRIVER_AVAILABILITY, DRIVER_VERIFICATION_STATUS } from "./constants.js";

const { Schema } = mongoose;

const DriverProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    verificationStatus: {
      type: String,
      enum: Object.values(DRIVER_VERIFICATION_STATUS),
      default: DRIVER_VERIFICATION_STATUS.PENDING,
      index: true,
    },

    availability: {
      type: String,
      enum: Object.values(DRIVER_AVAILABILITY),
      default: DRIVER_AVAILABILITY.OFFLINE,
      index: true,
    },

    current_location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
        validate: {
          validator: (v) => !v || v.length === 2,
          message: "current_location must be [lng, lat]",
        },
      },
    },

    location_updated_at: {
      type: Date,
    },

    // one active trip per driver
    activeTrip: { type: Schema.Types.ObjectId, ref: "Trip", index: true },

    licenseNumber: { type: String, trim: true },
    licenseExpiry: { type: Date },

    backgroundCheckRef: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// geo index for driver location
DriverProfileSchema.index({ current_location: "2dsphere" });

export default mongoose.model("DriverProfile", DriverProfileSchema);