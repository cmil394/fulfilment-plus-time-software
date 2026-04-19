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
  pin: true,
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
  const email = data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
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
  const generatedPin = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  const user = await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      fullName: data.fullname,
      firstName,
      lastName,
      pin: generatedPin,
      role: "Employee",
      status: "PENDING",
    },
    select: publicUserSelect,
  });

  return { user };
};

export const loginUser = async (data: LoginInput) => {
  const email = data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
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

export const loginWithPin = async (pin: string) => {
  const user = await prisma.user.findUnique({
    where: { pin },
  });
 
  if (!user) {
    throw new AppError(401,"Invalid PIN");
  }
 
  if (user.status !== "APPROVED") {
    throw new AppError(403,"Account not approved");
  }
 
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
 
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
};

export const clockOut = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  return { userId };
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
  requesterId: string,
  targetId: string,
  data: AdminUpdateUserInput,
  requesterRole: string,
) => {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError("User not found");

  if (target.role === "Owner") {
    throw new ForbiddenError("Owner role cannot be modified");
  }

  if (data.role && data.role !== target.role) {
    if (requesterRole === "Admin") {
      if (target.role !== "Employee" || data.role !== "Admin") {
        throw new ForbiddenError("Admins can only promote Employees to Admin");
      }
    } else if (requesterRole === "Owner") {
      const validTransitions: Record<string, string[]> = {
        Employee: ["Admin"],
        Admin: ["Employee"],
      };
      if (!validTransitions[target.role]?.includes(data.role)) {
        throw new ForbiddenError(
          `Cannot change role from ${target.role} to ${data.role}`,
        );
      }
    }
  }

  return prisma.user.update({
    where: { id: targetId },
    data,
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      pin: true,
    },
  });
};

export const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");
  if (user.role !== "Employee")
    throw new ForbiddenError(
      "Only employees can be deleted, please demote role before deletion",
    );
  return await prisma.user.delete({ where: { id: userId } });
};
