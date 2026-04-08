import Rating from "../models/Rating.model.js";
import Trip from "../models/Trip.model.js";
import DriverProfile from "../models/DriverProfile.model.js";

export const createRating = async (req, res) => {
  try {
    const { tripId, stars, comment, tip_amount } = req.body;
    const userId = req.user._id;

    const trip = await Trip.findById(tripId).populate("driverProfile", "user");

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (trip.status !== "COMPLETED") {
      return res.status(400).json({ error: "Trip not completed yet" });
    }

    let targetUser;
    let targetType;

    if (trip.rider.toString() === userId.toString()) {
      targetUser = trip.driverProfile?.user;
      targetType = "DRIVER";
    } else if (trip.driverProfile?.user?.toString() === userId.toString()) {
      targetUser = trip.rider;
      targetType = "RIDER";
    } else {
      return res.status(403).json({ error: "Not part of this trip" });
    }

    if (!targetUser) {
      return res.status(400).json({ error: "Could not determine rating target" });
    }

    const rating = await Rating.create({
      trip: tripId,
      rater: userId,
      targetUser,
      targetType,
      stars,
      comment,
      tip_amount: tip_amount ?? 0,
    });

    await Trip.findByIdAndUpdate(tripId, { rating: rating._id });

    // Recompute and cache average rating on DriverProfile when a rider rates a driver
    if (targetType === "DRIVER") {
      const allRatings = await Rating.find({ targetUser: targetUser, targetType: "DRIVER" });
      const count = allRatings.length;
      const avg = count === 0 ? 0 : allRatings.reduce((sum, r) => sum + r.stars, 0) / count;
      await DriverProfile.findOneAndUpdate(
        { user: targetUser },
        { averageRating: Math.round(avg * 10) / 10, ratingCount: count }
      );
    }

    res.status(201).json({
      success: true,
      rating
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "You already rated this trip" });
    }

    res.status(500).json({ error: "Server error creating rating" });
  }
};


export const getRatingsForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const ratings = await Rating.find({ targetUser: userId })
      .populate("rater", "name")
      .sort({ createdAt: -1 });

    const count = ratings.length;

    const avg =
      count === 0
        ? 0
        : ratings.reduce((sum, r) => sum + r.stars, 0) / count;

    res.json({
      success: true,
      average_rating: avg,
      rating_count: count,
      ratings
    });

  } catch (err) {
    res.status(500).json({ error: "Server error fetching ratings" });
  }
};


export const getRatingsForTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const ratings = await Rating.find({ trip: tripId })
      .populate("rater", "name")
      .populate("targetUser", "name");

    res.json({
      success: true,
      ratings
    });

  } catch (err) {
    res.status(500).json({ error: "Server error fetching trip ratings" });
  }
};