import { z } from "zod";

export const templateTaskSchema = z.object({
  // Adhoc or Master Task
  // Adhoc or Master Task
  taskId: z.number().optional(),
  name: z.string().min(1, "Task name is required"),

  duration: z.number().min(0, "Duration must be non-negative"),
  dayOffset: z.number(),
  startTime: z.string().optional(), // "HH:MM"
  sequenceOrder: z.number(),
  type: z.enum(["PROCESS", "CUTOFF"]), // 'CUTOFF' or 'PROCESS'
  color: z.string().optional().default("primary"),
  isCashConfirmed: z.boolean().default(false),

  // UI usage
  tempId: z.string(),
  dependsOnTempId: z.string().optional(), // Single dependency now

  saveToMaster: z.boolean(),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tasks: z.array(templateTaskSchema).min(1, "At least one task is required"),
});

export type TemplateInput = z.infer<typeof templateSchema>;
export type TemplateTaskInput = z.infer<typeof templateTaskSchema>;
