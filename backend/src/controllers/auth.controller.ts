import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  registerSchema,
  loginSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
  pinLoginSchema,
  changePasswordSchema,
} from "../validators/auth.validator";
import * as authService from "../services/auth.service";
import { AppError, UnauthorizedError } from "../utils/errors";
import { generateToken } from "../utils/auth";

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

export const loginWithPin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { employeeCode, pin } = pinLoginSchema.parse(req.body);
    const result = await authService.loginWithPin(employeeCode, pin);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const clockOut = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await authService.clockOut(userId);

    res.status(200).json({
      status: "success",
      message: "Clocked out successfully",
    });
  } catch (err) {
    next(err);
  }
};

// User
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

export const revealPin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const { password } = req.body;
    if (!password) throw new AppError(400, "Password is required");
    const result = await authService.revealPin(req.user.userId, password);
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const data = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.userId, data);
    res
      .status(200)
      .json({ status: "success", message: "Password updated successfully" });
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

export const resetUserPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { newPassword } = adminResetPasswordSchema.parse(req.body);
    await authService.adminResetUserPassword(
      req.params.id as string,
      newPassword,
    );
    res
      .status(200)
      .json({ status: "success", message: "Password reset successfully" });
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
    await authService.deleteUser(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "User rejected and removed",
    });
  } catch (err) {
    next(err);
  }
};

export const adminUpdateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw new UnauthorizedError();
    const data = adminUpdateUserSchema.parse(req.body);
    const user = await authService.adminUpdateUser(
      req.user.userId,
      req.params.id as string,
      data,
      req.user.role,
    );
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await authService.deleteUser(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
