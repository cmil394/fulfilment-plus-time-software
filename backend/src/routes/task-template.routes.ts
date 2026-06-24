import express from "express";
import {
  getTaskTemplates,
  getTaskTemplateById,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  assignTaskTemplate,
  syncTaskDescriptions,
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

// Sync descriptions from templates to tasks based on name
router.post("/task-templates/sync-descriptions", authMiddleware, adminMiddleware, writeLimiter, syncTaskDescriptions);

// Assign template
router.post("/task-templates/:id/assign", authMiddleware, adminMiddleware, writeLimiter, assignTaskTemplate);

export default router;
