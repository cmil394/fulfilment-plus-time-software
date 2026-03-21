import { prisma } from "../lib/prisma";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../validators/customer.validator";
import { NotFoundError } from "../utils/errors";

// Read

export const getCustomers = async () => {
  const customers = await prisma.customer.findMany({
    include: {
      tasks: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers;
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
  return prisma.customer.create({
    data: { name: data.name },
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

export const deleteCustomer = async (id: string) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found");

  await prisma.customer.delete({ where: { id } });
};
