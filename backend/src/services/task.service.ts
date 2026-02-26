import { prisma } from "../lib/prisma";
import { CreateTaskInput, UpdateTaskInput } from "../validators/task.validator";
import { NotFoundError } from "../utils/errors";
import Decimal from "decimal.js";

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
      fixedRate: data.fixedRate ? new Decimal(data.fixedRate) : null,
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
      fixedRate: data.fixedRate ? new Decimal(data.fixedRate) : undefined,
      active: data.active,
    },
  });
};

export const deleteTask = async (id: string) => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task not found");

  await prisma.task.delete({ where: { id } });
};

export const getTasks = async () => {
  return prisma.task.findMany({
    include: {
      customer: true,
    },
  });
};

export const getTaskById = async (id: string) => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      customer: true,
    },
  });
  if (!task) throw new NotFoundError("Task not found");
  return task;
};

export const getTasksByCustomer = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  return prisma.task.findMany({
    where: { customerId },
    include: {
      customer: true,
    },
  });
};
