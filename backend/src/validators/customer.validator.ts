import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  active: z.boolean().optional(),
});
