import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  startTimerSchema,
  adminCreateEntrySchema,
} from "../validators/time-entry.validator";
import * as timeEntryService from "../services/time-entry.service";
import { UnauthorizedError } from "../utils/errors";

// Timer
export const startTimer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const data = startTimerSchema.parse(req.body);
    const entry = await timeEntryService.startTimer(req.user.userId, data);
    res.status(201).json({
      status: "success",
      message: "Timer started",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const stopTimer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const entry = await timeEntryService.stopTimer(req.user.userId);
    res.status(200).json({
      status: "success",
      message: "Timer stopped",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveTimer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const entry = await timeEntryService.getActiveTimer(req.user.userId);
    res.status(200).json({
      status: "success",
      data: entry ?? null,
    });
  } catch (err) {
    next(err);
  }
};

// User
export const getMyEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const entries = await timeEntryService.getMyEntries(req.user.userId);
    res.status(200).json({
      status: "success",
      message: "Time entries retrieved successfully",
      data: entries,
    });
  } catch (err) {
    next(err);
  }
};

// Admin
export const getEntriesByUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entries = await timeEntryService.getEntriesByUser(
      req.params.userId as string,
    );
    res.status(200).json({
      status: "success",
      data: entries,
    });
  } catch (err) {
    next(err);
  }
};

export const getEntriesByCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entries = await timeEntryService.getEntriesByCustomer(
      req.params.customerId as string,
    );
    res.status(200).json({
      status: "success",
      data: entries,
    });
  } catch (err) {
    next(err);
  }
};

export const adminCreateEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const data = adminCreateEntrySchema.parse(req.body);
    const entry = await timeEntryService.adminCreateEntry(
      req.user.userId,
      data,
    );
    res.status(201).json({
      status: "success",
      message: "Time entry created successfully",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAllEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await timeEntryService.deleteAllEntries();
    res.status(200).json({
      status: "success",
      message: `Deleted ${result.count} time entries`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteEntriesByUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await timeEntryService.deleteEntriesByUser(
      req.params.userId as string,
    );
    res.status(200).json({
      status: "success",
      message: `Deleted ${result.count} time entries for user`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteEntriesByCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await timeEntryService.deleteEntriesByCustomer(
      req.params.customerId as string,
    );
    res.status(200).json({
      status: "success",
      message: `Deleted ${result.count} time entries for customer`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
