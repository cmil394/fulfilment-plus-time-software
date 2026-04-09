import express from "express";
import {
  getTasks,
  getTaskById,
  getTasksByCustomer,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { readLimiter, writeLimiter } from "../middleware/rate-limiting.middleware";

const router = express.Router();

// Get requests(auth)
router.get("/tasks", authMiddleware, readLimiter, getTasks);
router.get("/tasks/customer/:customerId", authMiddleware, readLimiter, getTasksByCustomer);
router.get("/tasks/:id", authMiddleware, readLimiter, getTaskById);

// Admin
router.post("/tasks", authMiddleware, adminMiddleware, writeLimiter, createTask);
router.patch("/tasks/:id", authMiddleware, adminMiddleware, writeLimiter, updateTask);
router.delete("/tasks/:id", authMiddleware, adminMiddleware, writeLimiter, deleteTask);

export default router;
