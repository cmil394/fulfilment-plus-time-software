import { Request, Response, NextFunction } from "express";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer.validator";
import * as customerService from "../services/customer.service";
import { sortObjectKeys } from "../utils/helpers";

export const createCustomer = async (
  req: Request,
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

export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customers = await customerService.getCustomers();

    const sortedCustomers = customers.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    res.status(200).json({
      status: "success",
      message: "Customers retrieved successfully",
      data: sortedCustomers,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (
  req: Request,
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

export const updateCustomer = async (
  req: Request,
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
  req: Request,
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
