import express from "express";
import {
  register,
  login,
  getProfile,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllAcceptedUsers,
} from "../controllers/auth.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
router.post("/auth/register", register);
router.post("/auth/login", login);

// Protected routes
router.get("/auth/profile", authMiddleware, getProfile);

// Admin routes
router.get(
  "/auth/admin/users",
  authMiddleware,
  adminMiddleware,
  getAllAcceptedUsers,
);
router.get(
  "/auth/admin/users/pending",
  authMiddleware,
  adminMiddleware,
  getPendingUsers,
);
router.patch(
  "/auth/admin/users/:id/approve",
  authMiddleware,
  adminMiddleware,
  approveUser,
);
router.patch(
  "/auth/admin/users/:id/reject",
  authMiddleware,
  adminMiddleware,
  rejectUser,
);

export default router;
