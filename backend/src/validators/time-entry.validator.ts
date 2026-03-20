import { z } from "zod";

export const startTimerSchema = z.object({
  taskId: z.string().uuid(),
  notes: z.string().optional(),
});

export const adminCreateEntrySchema = z
  .object({
    userId: z.string().min(1, "userId is required"),
    taskId: z.string().min(1, "taskId is required"),
    startTime: z
      .string()
      .datetime({ message: "startTime must be a valid ISO 8601 datetime" }),
    endTime: z
      .string()
      .datetime({ message: "endTime must be a valid ISO 8601 datetime" }),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  })
  .refine((data) => new Date(data.startTime) <= new Date(), {
    message: "startTime cannot be in the future",
    path: ["startTime"],
  });

export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type AdminCreateEntryInput = z.infer<typeof adminCreateEntrySchema>;
