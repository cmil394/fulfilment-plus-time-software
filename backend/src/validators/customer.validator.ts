import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  ownerName: z.string().min(1, "Owner name is required").optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
