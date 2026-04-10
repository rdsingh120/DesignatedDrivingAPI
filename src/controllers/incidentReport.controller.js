import IncidentReport from "../models/IncidentReport.model.js";


export async function getAllIncidentReports(req, res) {
  try {
    const reports = await IncidentReport.find()
      .populate({
        path: "trip",
        select: "_id status pickup_display_address dropoff_display_address fare_amount currency",
      })
      .populate({
        path: "reportedBy",
        select: "_id name email",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error("getAllIncidentReports error:", err);
    return res.status(500).json({ message: "Server error fetching incident reports" });
  }
}


export async function resolveIncidentReport(req, res) {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const report = await IncidentReport.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || "",
      },
      { new: true }
    )
      .populate({ path: "trip", select: "_id status pickup_display_address dropoff_display_address" })
      .populate({ path: "reportedBy", select: "_id name email" });

    if (!report) return res.status(404).json({ message: "Incident report not found" });

    return res.status(200).json({ success: true, report });
  } catch (err) {
    console.error("resolveIncidentReport error:", err);
    return res.status(500).json({ message: "Server error resolving incident report" });
  }
}
