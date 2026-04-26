import express from "express";
import {
  register,
  login,
  getProfile,
  changePassword,
  getAllAcceptedUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  adminUpdateUser,
  deleteUser,
  loginWithPin,
  clockOut,
} from "../controllers/auth.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { readLimiter, writeLimiter} from "../middleware/rate-limiting.middleware";

const router = express.Router();

//  Public
router.post("/auth/register", writeLimiter, register);
router.post("/auth/login", writeLimiter, login);
router.post("/auth/login/pin", writeLimiter, loginWithPin);
router.post("/auth/logout/pin", authMiddleware, clockOut);

// Protected
router.get("/auth/profile", authMiddleware, readLimiter, getProfile);
router.patch("/auth/change-password", authMiddleware, writeLimiter, changePassword);

// Admin
router.get("/auth/admin/users", authMiddleware, adminMiddleware, readLimiter, getAllAcceptedUsers);
router.get("/auth/admin/users/pending", authMiddleware, adminMiddleware, readLimiter, getPendingUsers);
router.patch("/auth/admin/users/:id/approve", authMiddleware, adminMiddleware, writeLimiter, approveUser);
router.patch("/auth/admin/users/:id/reject", authMiddleware, adminMiddleware, writeLimiter, rejectUser);
router.patch("/auth/admin/users/:id", authMiddleware, adminMiddleware, writeLimiter, adminUpdateUser);
router.delete("/auth/admin/users/:id", authMiddleware, adminMiddleware, writeLimiter, deleteUser);

export default router;
