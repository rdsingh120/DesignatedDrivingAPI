// src/controllers/savedLocation.controller.js
import SavedLocation from "../models/SavedLocation.model.js";

// GET /me
export const getMySavedLocations = async (req, res) => {
  const data = await SavedLocation.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(data);
};

// POST /me
export const createSavedLocation = async (req, res) => {
  const { label, address } = req.body;

  if (!address || !address.trim()) {
    return res.status(400).json({ message: "Address is required" });
  }

  const saved = await SavedLocation.create({
    user: req.user._id,
    label,
    address: address.trim(),
  });

  res.status(201).json(saved);
};

// PUT /:id
export const updateSavedLocation = async (req, res) => {
  const { label, address } = req.body;

  if (!address || !address.trim()) {
    return res.status(400).json({ message: "Address is required" });
  }

  const updated = await SavedLocation.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      label,
      address: address.trim(),
    },
    { new: true },
  );
  
  if (!updated) {
    return res.status(404).json({ message: "Location not found" });
  }

  res.json(updated);
};
