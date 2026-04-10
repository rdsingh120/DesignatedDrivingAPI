import IncidentReport from "../models/IncidentReport.model.js";
import Trip from "../models/Trip.model.js";

export const createIncidentReport = async (req, res) => {
  try {
    const { type, description, severity } = req.body;
    const userId = req.user._id;
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (trip.status !== "COMPLETED") {
      return res.status(400).json({ error: "Can only report issues on completed trips" });
    }

    if (trip.rider.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to report an issue for this trip" });
    }

    const report = await IncidentReport.create({
      trip: tripId,
      reportedBy: userId,
      type,
      description,
      severity: severity ?? 3,
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: "Server error creating incident report" });
  }
};
