/* prettier-ignore-file */
import express from "express";
import {
  register,
  login,
  getProfile,
  getAllAcceptedUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  adminUpdateUser,
} from "../controllers/auth.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

//  Public
router.post("/auth/register", register);
router.post("/auth/login", login);

// Protected
router.get("/auth/profile", authMiddleware, getProfile);

// Admin
router.get("/auth/admin/users", authMiddleware, adminMiddleware, getAllAcceptedUsers);
router.get("/auth/admin/users/pending", authMiddleware, adminMiddleware,getPendingUsers);
router.patch("/auth/admin/users/:id/approve", authMiddleware, adminMiddleware, approveUser);
router.patch("/auth/admin/users/:id/reject", authMiddleware, adminMiddleware, rejectUser);
router.patch("/auth/admin/users/:id", authMiddleware, adminMiddleware, adminUpdateUser);

export default router;
