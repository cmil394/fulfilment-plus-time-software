import express from "express";
import {
  register,
  login,
  getProfile,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/auth.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", authMiddleware, getProfile);

// Admin routes
router.get(
  "/admin/users/pending",
  authMiddleware,
  adminMiddleware,
  getPendingUsers,
);
router.patch(
  "/admin/users/:id/approve",
  authMiddleware,
  adminMiddleware,
  approveUser,
);
router.patch(
  "/admin/users/:id/reject",
  authMiddleware,
  adminMiddleware,
  rejectUser,
);

export default router;
