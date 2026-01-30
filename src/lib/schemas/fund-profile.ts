import { z } from "zod";

export const fundProfileSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  isin: z.string().optional(),
  officeStart: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
    .default("09:00"),
  officeEnd: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
    .default("18:00"),
  timezone: z.string().default("CET"),
  currentTemplateId: z.number().nullable().optional(),
  targetTemplateId: z.number().nullable().optional(),
});

export type FundProfileInput = z.infer<typeof fundProfileSchema>;
