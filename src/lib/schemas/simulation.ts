import { z } from "zod";

export const simulationSchema = z.object({
  simulationName: z.string().min(1, "Simulation name is required"),
  fundId: z.number().int().positive("Fund must be selected"),
});

export type SimulationFormData = z.infer<typeof simulationSchema>;
