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
  });

  customers.sort((a, b) => {
    if (a.name === "Fulfilment Plus") return -1;
    if (b.name === "Fulfilment Plus") return 1;
    return a.name.localeCompare(b.name);
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
    data: {
      name: data.name,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
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

export const deleteCustomer = async (id: string) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found");

  await prisma.$transaction([
    prisma.timeEntry.deleteMany({ where: { customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);
};
