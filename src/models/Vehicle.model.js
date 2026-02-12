// src/models/Vehicle.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const VehicleSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1980, max: 2100 },
    color: { type: String, trim: true, maxlength: 40 },

    plateNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    vin: { type: String, trim: true, uppercase: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Prevent same owner having duplicate plate entries
VehicleSchema.index({ owner: 1, plateNumber: 1 }, { unique: true });

export default mongoose.model("Vehicle", VehicleSchema);
