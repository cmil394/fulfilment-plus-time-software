import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { registerSchema, loginSchema } from "../validators/auth.validator";
import { ZodError } from "zod";

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Split fullname into firstName and lastName
    const nameParts = validatedData.fullname.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || nameParts[0]; // Use first name if no last name

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        fullName: validatedData.fullname,
        firstName,
        lastName,
        role: "EMPLOYEE",
        status: "PENDING", // New users need approval
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      status: "success",
      message: "Registration successful. Awaiting admin approval.",
      data: {
        user,
        token,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: zodError.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      status: "error",
      message: "Registration failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Check if user is approved
    if (user.status !== "APPROVED") {
      return res.status(403).json({
        status: "error",
        message: `Account is ${user.status.toLowerCase()}. Please contact an administrator.`,
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user data (without password)
    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: zodError.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    console.error("Login error:", error);
    return res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error: unknown) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to get profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Admin handlers

export const getPendingUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      status: "success",
      data: { users, total: users.length },
    });
  } catch (error: unknown) {
    console.error("Get pending users error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pending users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const approveUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    if (user.status === "APPROVED") {
      return res
        .status(400)
        .json({ status: "error", message: "User is already approved" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "APPROVED" },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "User approved successfully",
      data: { user: updatedUser },
    });
  } catch (error: unknown) {
    console.error("Approve user error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to approve user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const rejectUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "REJECTED" },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "User rejected",
      data: { user: updatedUser },
    });
  } catch (error: unknown) {
    console.error("Reject user error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reject user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
