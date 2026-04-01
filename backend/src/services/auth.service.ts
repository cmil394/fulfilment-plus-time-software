import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import {
  RegisterInput,
  LoginInput,
  AdminUpdateUserInput,
} from "../validators/auth.validator";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  AppError,
} from "../utils/errors";

// Selects
const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const fullUserSelect = {
  ...publicUserSelect,
  updatedAt: true,
} as const;

// Auth
export const registerUser = async (data: RegisterInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new ConflictError("Email already registered");
  }

  // TODO: Update Prisma schema to support middle names
  const nameParts = data.fullname.trim().split(" ");
  const firstName = nameParts[0];
  const middleNames = nameParts.slice(1, -1).join(" ");
  const lastName = nameParts[nameParts.length - 1];

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      fullName: data.fullname,
      firstName,
      lastName,
      role: "Employee",
      status: "PENDING",
    },
    select: publicUserSelect,
  });

  return { user };
};

export const loginUser = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid Email");
  }

  const isValid = await comparePassword(data.password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid Password");
  }

  if (user.status !== "APPROVED") {
    throw new ForbiddenError(
      `Account is ${user.status.toLowerCase()}. Please contact an administrator.`,
    );
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

// User
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: fullUserSelect,
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

// Admin
export const getAllAcceptedUsers = async () => {
  const users = await prisma.user.findMany({
    where: { status: "APPROVED" },
    select: publicUserSelect,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return { users, total: users.length };
};

export const getPendingUsers = async () => {
  const users = await prisma.user.findMany({
    where: { status: "PENDING" },
    select: publicUserSelect,
    orderBy: { createdAt: "desc" },
  });

  return { users, total: users.length };
};

export const updateUserStatus = async (
  id: string,
  status: "APPROVED" | "REJECTED",
) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (status === "APPROVED" && user.status === "APPROVED") {
    throw new AppError(400, "User is already approved");
  }

  return prisma.user.update({
    where: { id },
    data: { status },
    select: { ...publicUserSelect, updatedAt: true },
  });
};

export const adminUpdateUser = async (
  id: string,
  data: AdminUpdateUserInput,
) => {
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
  return user;
};
