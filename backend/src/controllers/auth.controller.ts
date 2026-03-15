import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../validators/auth.validator";
import * as authService from "../services/auth.service";
import { UnauthorizedError } from "../utils/errors";

// Auth

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json({
      status: "success",
      message: "Registration successful. Awaiting admin approval.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const user = await authService.getUserProfile(req.user.userId);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

// Admin

export const getAllAcceptedUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.getAllAcceptedUsers();
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const getPendingUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.getPendingUsers();
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const approveUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await authService.updateUserStatus(
      req.params.id as string,
      "APPROVED",
    );
    res.status(200).json({
      status: "success",
      message: "User approved successfully",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const rejectUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await authService.updateUserStatus(
      req.params.id as string,
      "REJECTED",
    );
    res.status(200).json({
      status: "success",
      message: "User rejected",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
