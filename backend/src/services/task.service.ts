import { prisma } from "../lib/prisma";
import { CreateTaskInput, UpdateTaskInput } from "../validators/task.validator";
import { NotFoundError } from "../utils/errors";
import Decimal from "decimal.js";

// Selects & Formatters
const taskSelect = {
  id: true,
  name: true,
  description: true,
  active: true,
  customerId: true,
  customer: {
    select: { name: true },
  },
};

const formatTask = (task: any) => ({
  id: task.id,
  name: task.name,
  description: task.description,
  active: task.active,
  customerId: task.customerId,
  customerName: task.customer.name,
});

// Read
export const getTasks = async () => {
  const tasks = await prisma.task.findMany({
    select: taskSelect,
    orderBy: { name: "asc" },
  });
  return tasks.map(formatTask);
};

export const getTaskById = async (id: string) => {
  const task = await prisma.task.findUnique({
    where: { id },
    select: taskSelect,
  });
  if (!task) throw new NotFoundError("Task not found");
  return formatTask(task);
};

export const getTasksByCustomer = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  const tasks = await prisma.task.findMany({
    where: { customerId },
    select: taskSelect,
    orderBy: { name: "asc" },
  });
  return tasks.map(formatTask);
};

// Write
export const createTask = async (data: CreateTaskInput) => {
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  return prisma.task.create({
    data: {
      customerId: data.customerId,
      name: data.name,
      description: data.description,
      // fixedRate: data.fixedRate ? new Decimal(data.fixedRate) : null,
    },
  });
};

export const updateTask = async (id: string, data: UpdateTaskInput) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task not found");

  return prisma.task.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      // fixedRate: data.fixedRate ? new Decimal(data.fixedRate) : undefined,
      active: data.active,
    },
  });
};

export const deleteTask = async (id: string) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task not found");

  await prisma.task.delete({ where: { id } });
};
