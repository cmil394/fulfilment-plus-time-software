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

const router = express.Router();

// Get requests(auth)
router.get("/tasks", authMiddleware, getTasks);
router.get("/tasks/customer/:customerId", authMiddleware, getTasksByCustomer);
router.get("/tasks/:id", authMiddleware, getTaskById);

// Admin
router.post("/tasks", authMiddleware, adminMiddleware, createTask);
router.patch("/tasks/:id", authMiddleware, adminMiddleware, updateTask);
router.delete("/tasks/:id", authMiddleware, adminMiddleware, deleteTask);

export default router;
