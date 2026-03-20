import { prisma } from "../lib/prisma";
import {
  StartTimerInput,
  AdminCreateEntryInput,
} from "../validators/time-entry.validator";
import { NotFoundError, ConflictError } from "../utils/errors";

export const startTimer = async (userId: string, data: StartTimerInput) => {
  // Check task exists and get customerId from it
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new NotFoundError("Task not found");

  // Prevent multiple active timers
  const active = await prisma.timeEntry.findFirst({
    where: { userId, endTime: null },
  });
  if (active) throw new ConflictError("You already have a timer running");

  return prisma.timeEntry.create({
    data: {
      userId,
      taskId: task.id,
      customerId: task.customerId,
      notes: data.notes,
    },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
};

export const stopTimer = async (userId: string) => {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, endTime: null },
  });
  if (!active) throw new NotFoundError("No active timer found");

  const endTime = new Date();
  const durationSeconds = Math.floor(
    (endTime.getTime() - active.startTime.getTime()) / 1000,
  );

  return prisma.timeEntry.update({
    where: { id: active.id },
    data: { endTime, durationSeconds },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
};

export const getActiveTimer = async (userId: string) => {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId, endTime: null },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  if (!entry) return null;

  const elapsedSeconds = Math.floor(
    (new Date().getTime() - entry.startTime.getTime()) / 1000,
  );

  return { ...entry, durationSeconds: elapsedSeconds };
};

export const getMyEntries = async (userId: string) => {
  return prisma.timeEntry.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
};

export const getEntriesByUser = async (userId: string) => {
  const entries = await prisma.timeEntry.findMany({
    where: { userId, endTime: { not: null } },
    orderBy: { startTime: "desc" },
    include: {
      task: { select: { name: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  // Group by customer
  const grouped = entries.reduce(
    (acc, entry) => {
      const customerId = entry.customer.id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: entry.customer,
          totalSeconds: 0,
          entries: [],
        };
      }
      acc[customerId].entries.push(entry);
      acc[customerId].totalSeconds += entry.durationSeconds ?? 0;
      return acc;
    },
    {} as Record<
      string,
      {
        customer: { id: string; name: string };
        totalSeconds: number;
        entries: typeof entries;
      }
    >,
  );

  return Object.values(grouped);
};

export const getEntriesByCustomer = async (customerId: string) => {
  const entries = await prisma.timeEntry.findMany({
    where: { customerId, endTime: { not: null } },
    orderBy: { startTime: "desc" },
    include: {
      task: { select: { name: true } },
      user: { select: { id: true, fullName: true } },
    },
  });

  // Group by user
  const grouped = entries.reduce(
    (acc, entry) => {
      const userId = entry.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          totalSeconds: 0,
          entries: [],
        };
      }
      acc[userId].entries.push(entry);
      acc[userId].totalSeconds += entry.durationSeconds ?? 0;
      return acc;
    },
    {} as Record<
      string,
      {
        user: { id: string; fullName: string };
        totalSeconds: number;
        entries: typeof entries;
      }
    >,
  );

  return Object.values(grouped);
};

export const deleteAllEntries = async () => {
  return prisma.timeEntry.deleteMany({});
};

export const deleteEntriesByUser = async (userId: string) => {
  return prisma.timeEntry.deleteMany({
    where: { userId },
  });
};

export const deleteEntriesByCustomer = async (customerId: string) => {
  return prisma.timeEntry.deleteMany({
    where: { customerId },
  });
};

export const adminCreateEntry = async (
  adminId: string,
  data: AdminCreateEntryInput,
) => {
  // Verify user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!targetUser) throw new NotFoundError("User not found");

  // Verify task exists and resolve customerId
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    select: { id: true, customerId: true, name: true },
  });
  if (!task) throw new NotFoundError("Task not found");

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  const durationSeconds = Math.floor(
    (endTime.getTime() - startTime.getTime()) / 1000,
  );

  // Check for overlapping entries for this user in this time window
  const overlap = await prisma.timeEntry.findFirst({
    where: {
      userId: data.userId,
      endTime: { not: null },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (overlap) {
    throw new ConflictError(
      `This time range overlaps with an existing entry (${overlap.startTime.toISOString()} – ${overlap.endTime!.toISOString()})`,
    );
  }

  return prisma.timeEntry.create({
    data: {
      userId: data.userId,
      taskId: task.id,
      customerId: task.customerId,
      notes: data.notes,
      startTime,
      endTime,
      durationSeconds,
    },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};
