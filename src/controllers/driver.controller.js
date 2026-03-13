import DriverProfile from "../models/DriverProfile.model.js";

export async function updateDriverLocation(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const driver = await DriverProfile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          current_location: {
            type: "Point",
            coordinates: [lng, lat],
          },
        },
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    return res.json({ success: true, location: driver.current_location });
  } catch (err) {
    console.error("updateDriverLocation error:", err);
    return res.status(500).json({ error: "Server error updating location" });
  }
}