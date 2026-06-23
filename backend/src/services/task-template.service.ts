import { prisma } from "../lib/prisma";
import {
  CreateTaskTemplateInput,
  UpdateTaskTemplateInput,
  AssignTaskTemplateInput,
} from "../validators/task-template.validator";
import { NotFoundError, ConflictError } from "../utils/errors";

// Selects & Formatters
const templateSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

// Read
export const getTaskTemplates = async () => {
  return prisma.taskTemplate.findMany({
    select: templateSelect,
    orderBy: { createdAt: "asc" },
  });
};

export const getTaskTemplateById = async (id: string) => {
  const template = await prisma.taskTemplate.findUnique({
    where: { id },
    select: templateSelect,
  });
  if (!template) throw new NotFoundError("Task template not found");
  return template;
};

// Write
export const createTaskTemplate = async (data: CreateTaskTemplateInput) => {
  return prisma.taskTemplate.create({
    data: {
      name: data.name,
      description: data.description,
    },
    select: templateSelect,
  });
};

export const updateTaskTemplate = async (
  id: string,
  data: UpdateTaskTemplateInput,
) => {
  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task template not found");

  return prisma.taskTemplate.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
    },
    select: templateSelect,
  });
};

export const deleteTaskTemplate = async (id: string) => {
  const existing = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task template not found");

  await prisma.taskTemplate.delete({ where: { id } });
};

export const syncTaskDescriptions = async () => {
  const templates = await prisma.taskTemplate.findMany({
    select: { name: true, description: true },
  });

  let updatedCount = 0;
  for (const template of templates) {
    const result = await prisma.task.updateMany({
      where: { name: template.name },
      data: { description: template.description },
    });
    updatedCount += result.count;
  }

  return { updatedCount };
};

export const assignTaskTemplate = async (
  id: string,
  data: AssignTaskTemplateInput,
) => {
  const template = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Task template not found");

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  const existing = await prisma.task.findFirst({
    where: { customerId: data.customerId, name: template.name },
  });
  if (existing)
    throw new ConflictError(
      `Task "${template.name}" already exists for this customer`,
    );

  const task = await prisma.task.create({
    data: {
      customerId: data.customerId,
      name: template.name,
      description: template.description,
    },
  });

  return task;
};
