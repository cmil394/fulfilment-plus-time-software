import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    firstname: z.string().min(2, "First name must be at least 2 charcters"),
    lastname: z.string().min(2, "Last name must be at least 2 charcters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["Admin", "Employee"]).optional(),
});

export const pinLoginSchema = z.object({
  employeeCode: z.string().min(4).max(4).regex(/^\d+$/, "PIN must be numeric"),
  pin: z.string().min(4).max(4).regex(/^\d+$/, "PIN must be numeric"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .regex(/\d/, "New password must contain at least one number"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export const adminResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/\d/, "Password must contain at least one number"),
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
