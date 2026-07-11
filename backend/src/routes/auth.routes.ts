import express from "express";
import {
  register,
  login,
  getProfile,
  changePassword,
  revealPin,
  getAllAcceptedUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  resetUserPassword,
  adminUpdateUser,
  deleteUser,
  loginWithPin,
  clockOut,
} from "../controllers/auth.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { readLimiter, writeLimiter, loginLimiter, passwordVerifyLimiter } from "../middleware/rate-limiting.middleware";

const router = express.Router();

//  Public
router.post("/auth/register", writeLimiter, register);
router.post("/auth/login", loginLimiter, login);
router.post("/auth/login/pin", loginLimiter, loginWithPin);
router.post("/auth/logout/pin", authMiddleware, clockOut);

// Protected
router.get("/auth/profile", authMiddleware, readLimiter, getProfile);
router.post("/auth/profile/reveal-pin", authMiddleware, passwordVerifyLimiter, revealPin);
router.patch("/auth/change-password", authMiddleware, passwordVerifyLimiter, changePassword);

// Admin
router.get("/auth/admin/users", authMiddleware, adminMiddleware, readLimiter, getAllAcceptedUsers);
router.get("/auth/admin/users/pending", authMiddleware, adminMiddleware, readLimiter, getPendingUsers);
router.patch("/auth/admin/users/:id/approve", authMiddleware, adminMiddleware, writeLimiter, approveUser);
router.patch("/auth/admin/users/:id/reject", authMiddleware, adminMiddleware, writeLimiter, rejectUser);
router.patch("/auth/admin/users/:id/reset-password", authMiddleware, adminMiddleware, writeLimiter, resetUserPassword);
router.patch("/auth/admin/users/:id", authMiddleware, adminMiddleware, writeLimiter, adminUpdateUser);
router.delete("/auth/admin/users/:id", authMiddleware, adminMiddleware, writeLimiter, deleteUser);

export default router;
