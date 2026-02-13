import Vehicle from "../models/Vehicle.model.js";

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

// POST /api/vehicles
export async function createVehicle(req, res) {
  try {
    const riderId = getUserId(req);
    if (!riderId) return res.status(401).json({ message: "No token provided" });

    const { make, model, year, color, plateNumber, vin } = req.body || {};

    if (!make || !model || !year || !plateNumber) {
      return res.status(400).json({
        error: "make, model, year, and plateNumber are required",
      });
    }

    const vehicle = await Vehicle.create({
      owner: riderId,
      make,
      model,
      year,
      color,
      plateNumber,
      vin,
    });

    return res.status(201).json({
      success: true,
      vehicle,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Vehicle with this plateNumber already exists for this user",
      });
    }

    console.error("createVehicle error:", err);
    return res.status(500).json({ error: "Server error creating vehicle" });
  }
}

// GET /api/vehicles/mine
export async function listMyVehicles(req, res) {
  try {
    const riderId = getUserId(req);
    if (!riderId) return res.status(401).json({ message: "No token provided" });

    const vehicles = await Vehicle.find({
      owner: riderId,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.json({ success: true, vehicles });
  } catch (err) {
    console.error("listMyVehicles error:", err);
    return res.status(500).json({ error: "Server error fetching vehicles" });
  }
}

// DELETE /api/vehicles/:id (soft delete)
export async function deactivateVehicle(req, res) {
  try {
    const riderId = getUserId(req);
    const { id } = req.params;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: id, owner: riderId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deactivateVehicle error:", err);
    return res.status(500).json({ error: "Server error updating vehicle" });
  }
}
