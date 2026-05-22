import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer.validator";
import * as customerService from "../services/customer.service";
import cloudinary from "../lib/cloudinary";

const uploadToCloudinary = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "customers/avatars", resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
};

const deleteFromCloudinary = async (url: string) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  if (match) {
    await cloudinary.uploader.destroy(match[1]);
  }
};

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
    let avatarUrl: string | undefined;

    if (req.file) {
      avatarUrl = await uploadToCloudinary(req.file.buffer);
    }

    const customer = await customerService.createCustomer({
      ...data,
      avatarUrl,
    });
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

export const reorderCustomers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) {
      res
        .status(400)
        .json({ status: "error", message: "orderedIds must be an array" });
      return;
    }
    await customerService.reorderCustomers(orderedIds);
    res.status(200).json({ status: "success", message: "Order saved" });
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
    const existing = await customerService.getCustomerById(customerId);

    if (existing.avatarUrl) {
      await deleteFromCloudinary(existing.avatarUrl);
    }

    const avatarUrl = await uploadToCloudinary(req.file.buffer);
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
