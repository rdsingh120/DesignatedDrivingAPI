// src/models/Rating.model.js
import mongoose from "mongoose";
import { RATING_TARGET } from "./constants.js";

const { Schema } = mongoose;

const RatingSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true, unique: true, index: true },

    rater: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: Object.values(RATING_TARGET), required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 800 },
    createdAtClient: { type: Date }, // optional: if you accept client timestamp
  },
  { timestamps: true }
);

RatingSchema.index({ targetUser: 1, stars: -1 });

export default mongoose.model("Rating", RatingSchema);
