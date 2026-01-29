"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSimulationData(fundId: number) {
  try {
    const fundProfile = await prisma.fundProfile.findUnique({
      where: { id: fundId },
      include: {
        currentTemplate: {
          include: {
            templateTasks: {
              orderBy: {
                sequenceOrder: "asc",
              },
            },
          },
        },
        targetTemplate: {
          include: {
            templateTasks: {
              orderBy: {
                sequenceOrder: "asc",
              },
            },
          },
        },
      },
    });

    if (!fundProfile) {
      return { error: "Fund profile not found" };
    }

    return { success: true, data: fundProfile };
  } catch (error) {
    console.error("Error fetching simulation data:", error);
    return { error: "Database error" };
  }
}

export async function getAllSimulations() {
  try {
    const simulations = await prisma.simulation.findMany({
      include: {
        fund: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: simulations };
  } catch (error) {
    console.error("Error fetching simulations:", error);
    return { error: "Database error" };
  }
}

export async function getSimulationById(id: number) {
  try {
    const simulation = await prisma.simulation.findUnique({
      where: { id },
      include: {
        fund: {
          include: {
            currentTemplate: {
              include: {
                templateTasks: {
                  orderBy: {
                    sequenceOrder: "asc",
                  },
                },
              },
            },
            targetTemplate: {
              include: {
                templateTasks: {
                  orderBy: {
                    sequenceOrder: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!simulation) {
      return { error: "Simulation not found" };
    }

    return { success: true, data: simulation };
  } catch (error) {
    console.error("Error fetching simulation:", error);
    return { error: "Database error" };
  }
}

export async function createSimulation(data: {
  fundId: number;
  simulationName?: string;
  currentStateJson?: string;
  targetStateJson?: string;
  reinvestmentGainHours?: number;
  idleTimeSavedMinutes?: number;
}) {
  try {
    const simulation = await prisma.simulation.create({
      data: {
        fundId: data.fundId,
        simulationName: data.simulationName,
        currentStateJson: data.currentStateJson,
        targetStateJson: data.targetStateJson,
        reinvestmentGainHours: data.reinvestmentGainHours,
        idleTimeSavedMinutes: data.idleTimeSavedMinutes,
      },
    });

    revalidatePath("/simulations");
    return { success: true, data: simulation };
  } catch (error) {
    console.error("Error creating simulation:", error);
    return { error: "Failed to create simulation" };
  }
}

export async function updateSimulation(
  id: number,
  data: {
    simulationName?: string;
    currentStateJson?: string;
    targetStateJson?: string;
    reinvestmentGainHours?: number;
    idleTimeSavedMinutes?: number;
  }
) {
  try {
    const simulation = await prisma.simulation.update({
      where: { id },
      data,
    });

    revalidatePath("/simulations");
    revalidatePath(`/simulations/${id}`);
    return { success: true, data: simulation };
  } catch (error) {
    console.error("Error updating simulation:", error);
    return { error: "Failed to update simulation" };
  }
}

export async function deleteSimulation(id: number) {
  try {
    await prisma.simulation.delete({
      where: { id },
    });

    revalidatePath("/simulations");
    return { success: true };
  } catch (error) {
    console.error("Error deleting simulation:", error);
    return { error: "Failed to delete simulation" };
  }
}
