import express from "express";
import {
  getTaskTemplates,
  getTaskTemplateById,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  assignTaskTemplate,
} from "../controllers/task-template.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { readLimiter, writeLimiter } from "../middleware/rate-limiting.middleware";

const router = express.Router();

router.get("/task-templates", authMiddleware, readLimiter, getTaskTemplates);
router.get("/task-templates/:id", authMiddleware, readLimiter, getTaskTemplateById);

router.post(
  "/task-templates",
  authMiddleware,
  adminMiddleware,
  writeLimiter,
  createTaskTemplate,
);
router.patch(
  "/task-templates/:id",
  authMiddleware,
  adminMiddleware,
  writeLimiter,
  updateTaskTemplate,
);
router.delete(
  "/task-templates/:id",
  authMiddleware,
  adminMiddleware,
  writeLimiter,
  deleteTaskTemplate,
);

// Assign template
router.post("/task-templates/:id/assign", authMiddleware, adminMiddleware, writeLimiter, assignTaskTemplate);

export default router;
