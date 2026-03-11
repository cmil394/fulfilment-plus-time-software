import { Request, Response, NextFunction } from "express";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator";
import * as taskService from "../services/task.service";
import { sortObjectKeys } from "../utils/helpers";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(data);
    res.status(201).json({
      status: "success",
      message: "Task created successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tasks = await taskService.getTasks();
    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await taskService.getTaskById(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Task retrieved successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tasks = await taskService.getTasksByCustomer(
      req.params.customerId as string
    );

    // Sort tasks alphabetically
    const sortedTasks = tasks.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      tasks: sortedTasks,
    });
  } catch (err) {
    next(err);
  }
};


export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.params.id as string, data);
    res.status(200).json({
      status: "success",
      message: "Task updated successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (
  req: Request,
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
