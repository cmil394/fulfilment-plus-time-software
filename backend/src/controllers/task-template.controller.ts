import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createTaskTemplateSchema,
  updateTaskTemplateSchema,
  assignTaskTemplateSchema,
} from "../validators/task-template.validator";
import * as taskTemplateService from "../services/task-template.service";

// Read
export const getTaskTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const templates = await taskTemplateService.getTaskTemplates();
    res.status(200).json({
      status: "success",
      message: "Task templates retrieved successfully",
      data: templates,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskTemplateById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const template = await taskTemplateService.getTaskTemplateById(
      req.params.id as string,
    );
    res.status(200).json({
      status: "success",
      message: "Task template retrieved successfully",
      data: template,
    });
  } catch (err) {
    next(err);
  }
};

// Write
export const createTaskTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createTaskTemplateSchema.parse(req.body);
    const template = await taskTemplateService.createTaskTemplate(data);
    res.status(201).json({
      status: "success",
      message: "Task template created successfully",
      data: template,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTaskTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = updateTaskTemplateSchema.parse(req.body);
    const template = await taskTemplateService.updateTaskTemplate(
      req.params.id as string,
      data,
    );
    res.status(200).json({
      status: "success",
      message: "Task template updated successfully",
      data: template,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTaskTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await taskTemplateService.deleteTaskTemplate(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Task template deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const syncTaskDescriptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await taskTemplateService.syncTaskDescriptions();
    res.status(200).json({
      status: "success",
      message: `${result.updatedCount} task(s) updated`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const assignTaskTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = assignTaskTemplateSchema.parse(req.body);
    const task = await taskTemplateService.assignTaskTemplate(
      req.params.id as string,
      data,
    );
    res.status(201).json({
      status: "success",
      message: "Template assigned successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};
