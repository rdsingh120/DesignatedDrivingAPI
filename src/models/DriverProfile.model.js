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

    // one active trip per driver (enforced via partial unique index on Trip too)
    activeTrip: { type: Schema.Types.ObjectId, ref: "Trip", index: true },

    licenseNumber: { type: String, trim: true },
    licenseExpiry: { type: Date },

    backgroundCheckRef: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export default mongoose.model("DriverProfile", DriverProfileSchema);
