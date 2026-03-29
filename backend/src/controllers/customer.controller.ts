import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer.validator";
import * as customerService from "../services/customer.service";
import fs from "fs";
import path from "path";

// Read
export const getCustomers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customers = await customerService.getCustomers();
    res.status(200).json({
      status: "success",
      message: "Customers retrieved successfully",
      data: customers,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customer = await customerService.getCustomerById(
      req.params.id as string,
    );
    res.status(200).json({
      status: "success",
      message: "Customer retrieved successfully",
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

// Write
export const createCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerService.createCustomer(data);
    res.status(201).json({
      status: "success",
      message: "Customer created successfully",
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerService.updateCustomer(
      req.params.id as string,
      data,
    );
    res.status(200).json({
      status: "success",
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await customerService.deleteCustomer(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Customer deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const uploadCustomerAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      res.status(400).json({ status: "error", message: "No file uploaded" });
      return;
    }

    const customerId = req.params.id as string;

    // Build the public URL that the frontend can use
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Fetch old avatar so we can delete it from disk
    const existing = await customerService.getCustomerById(customerId);
    if (existing.avatarUrl) {
      const oldPath = path.join(process.cwd(), existing.avatarUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const customer = await customerService.updateCustomer(customerId, {
      avatarUrl,
    });

    res.status(200).json({
      status: "success",
      message: "Avatar uploaded successfully",
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};
