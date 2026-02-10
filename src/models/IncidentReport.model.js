// src/models/IncidentReport.model.js
import mongoose from "mongoose";
import { INCIDENT_TYPE } from "./constants.js";

const { Schema } = mongoose;

const IncidentReportSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: Object.values(INCIDENT_TYPE), required: true, index: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },

    severity: { type: Number, min: 1, max: 5, default: 3, index: true },
    attachments: [{ type: String, trim: true }], // store URLs/paths later

    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

IncidentReportSchema.index({ trip: 1, createdAt: -1 });

export default mongoose.model("IncidentReport", IncidentReportSchema);
