// models/SavedLocation.model.js
import mongoose from "mongoose";

const savedLocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("SavedLocation", savedLocationSchema);

