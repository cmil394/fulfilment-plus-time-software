import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  startTimerSchema,
  adminCreateEntrySchema,
  adminUpdateEntrySchema,
} from "../validators/time-entry.validator";
import * as timeEntryService from "../services/time-entry.service";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

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

export const getAllActiveTimers = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entries = await timeEntryService.getAllActiveTimers();
    res.status(200).json({
      status: "success",
      data: entries,
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
    const { startDate, endDate } = req.query;
    const entries = await timeEntryService.getMyEntries(
      req.user.userId,
      startDate as string | undefined,
      endDate as string | undefined,
    );
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
    const { startDate, endDate } = req.query;
    const entries = await timeEntryService.getEntriesByUser(
      req.params.userId as string,
      startDate as string | undefined,
      endDate as string | undefined,
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
    const { startDate, endDate } = req.query;
    const entries = await timeEntryService.getEntriesByCustomer(
      req.params.customerId as string,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.status(200).json({
      status: "success",
      data: entries,
    });
  } catch (err) {
    next(err);
  }
};

export const getEntryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entry = await timeEntryService.getEntryById(
      req.params.entryId as string,
    );
    res.status(200).json({
      status: "success",
      data: entry,
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

export const adminStopTimer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const entry = await timeEntryService.stopTimer(req.params.userId as string);
    res.status(200).json({
      status: "success",
      message: "Timer stopped",
      data: entry,
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
export const deleteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const isAdmin = req.user.role === "Admin" || req.user.role === "Owner";
    if (!isAdmin) {
      const existing = await timeEntryService.getEntryById(
        req.params.entryId as string,
      );
      if (existing.userId !== req.user.userId) {
        throw new ForbiddenError("You can only delete your own time entries");
      }
    }
    await timeEntryService.deleteEntry(req.params.entryId as string);
    res.status(200).json({
      status: "success",
      message: "Time entry deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const updateEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const isAdmin = req.user.role === "Admin" || req.user.role === "Owner";
    if (!isAdmin) {
      const existing = await timeEntryService.getEntryById(
        req.params.entryId as string,
      );
      if (existing.userId !== req.user.userId) {
        throw new ForbiddenError("You can only edit your own time entries");
      }
    }
    const data = adminUpdateEntrySchema.parse(req.body);
    const entry = await timeEntryService.updateEntry(
      req.params.entryId as string,
      data,
    );
    res.status(200).json({
      status: "success",
      message: "Time entry updated successfully",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
};
