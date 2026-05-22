import { prisma } from "../lib/prisma";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../validators/customer.validator";
import { NotFoundError } from "../utils/errors";

// Read

export const getCustomers = async () => {
  return prisma.customer.findMany({
    include: {
      tasks: {
        select: { name: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tasks: {
        select: { name: true },
      },
    },
  });

  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
};

// Write
export const createCustomer = async (data: CreateCustomerInput) => {
  const agg = await prisma.customer.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (agg._max.sortOrder ?? -1) + 1;

  return prisma.customer.create({
    data: {
      name: data.name,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      sortOrder: nextOrder,
    },
  });
};

export const updateCustomer = async (id: string, data: UpdateCustomerInput) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found");

  return prisma.customer.update({
    where: { id },
    data,
  });
};

export const reorderCustomers = async (orderedIds: string[]) => {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.customer.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
};

export const deleteCustomer = async (id: string) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found");

  await prisma.$transaction([
    prisma.timeEntry.deleteMany({ where: { customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);
};
