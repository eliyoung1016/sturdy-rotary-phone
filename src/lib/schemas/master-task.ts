import { z } from "zod";

export const masterTaskSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    type: z.enum(["CUTOFF", "PROCESS"]),
    duration: z.coerce
      .number()
      .int("Duration must be a whole number")
      .min(0, "Duration must be positive"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PROCESS" && data.duration < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duration must be at least 1 minute for Process tasks",
        path: ["duration"],
      });
    }
  });

export type MasterTaskInput = z.infer<typeof masterTaskSchema>;
