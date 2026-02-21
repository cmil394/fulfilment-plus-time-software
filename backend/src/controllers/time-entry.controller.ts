import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { startTimerSchema } from "../validators/time-entry.validator";
import * as timeEntryService from "../services/time-entry.service";
import { UnauthorizedError } from "../utils/errors";

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
