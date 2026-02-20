import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer.validator";
import { ZodError } from "zod";

const prisma = new PrismaClient();

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Create customer error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create customer",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const validatedData = updateCustomerSchema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id: req.params.id as string },
      data: validatedData,
    });

    return res.status(200).json({
      status: "success",
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Update customer error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update customer",
    });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id as string },
    });

    return res.status(200).json({
      status: "success",
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to delete customer",
    });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany();
    return res.status(200).json({
      status: "success",
      message: "Customers retrieved successfully",
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve customers",
    });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id as string },
    });
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Customer retrieved successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve customer",
    });
  }
};
