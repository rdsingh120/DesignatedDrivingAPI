import express from "express";
import { getMyProfile, updateMyProfile, getAllUsers, deleteUser } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

router.get("/all", protect, getAllUsers);
router.delete("/:id", protect, deleteUser);

export default router;
