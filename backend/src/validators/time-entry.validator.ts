import { z } from "zod";

export const startTimerSchema = z.object({
  taskId: z.string().uuid(),
  notes: z.string().optional(),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;
