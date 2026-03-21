import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator";
import * as taskService from "../services/task.service";

// Read
export const getTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tasks = await taskService.getTasks();
    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await taskService.getTaskById(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tasks = await taskService.getTasksByCustomer(
      req.params.customerId as string,
    );
    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// Write
export const createTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(data);
    res.status(201).json({
      status: "success",
      message: "Task created successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.params.id as string, data);
    res.status(200).json({
      status: "success",
      message: "Task updated successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await taskService.deleteTask(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Task deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
