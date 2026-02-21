import { prisma } from "../lib/prisma";
import { StartTimerInput } from "../validators/time-entry.validator";
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
  return prisma.timeEntry.findFirst({
    where: { userId, endTime: null },
    include: {
      task: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
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
