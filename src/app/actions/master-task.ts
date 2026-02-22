"use server";

import { revalidatePath } from "next/cache";

import type { MasterTask } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  type MasterTaskInput,
  masterTaskSchema,
} from "@/lib/schemas/master-task";
import type { ActionResponse } from "@/types/actions";

export type MasterTaskWithRelations = MasterTask & {
  correspondingTask: MasterTask | null;
  correspondingTaskOf: MasterTask | null;
};

export async function createMasterTask(data: MasterTaskInput): Promise<ActionResponse<void>> {
  const result = masterTaskSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: "Validation error",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const {
      name,
      description,
      type,
      duration,
      color,
      isCashConfirmed,
      requiresWorkingHours,
      shortName,
      correspondingTaskId,
    } = result.data;

    await prisma.$transaction(async (tx) => {
      // Create the task first
      const newTask = await tx.masterTask.create({
        data: {
          name,
          description,
          type,
          duration,
          color,
          isCashConfirmed,
          requiresWorkingHours,
          shortName,
          // Don't set correspondingTaskId yet, we handle it below to ensure symmetry safe
        },
      });

      // Validating and setting up the relationship if correspondingTaskId is provided
      // Validating and setting up the relationship if correspondingTaskId is provided
      if (correspondingTaskId) {
        // 1. Break any existing links involving the target task
        // Find if target task has any existing partner
        const targetTask = await tx.masterTask.findUnique({
          where: { id: correspondingTaskId },
          include: { correspondingTask: true, correspondingTaskOf: true },
        });

        if (targetTask) {
          const existingPartnerId =
            targetTask.correspondingTaskId ??
            targetTask.correspondingTaskOf?.id;

          if (existingPartnerId) {
            // target -> partner
            if (targetTask.correspondingTaskId) {
              await tx.masterTask.update({
                where: { id: correspondingTaskId },
                data: { correspondingTaskId: null },
              });
            }
            // partner -> target
            if (targetTask.correspondingTaskOf) {
              await tx.masterTask.update({
                where: { id: existingPartnerId },
                data: { correspondingTaskId: null },
              });
            }
            // Also ensure the partner doesn't point to target (redundant but safe)
            await tx.masterTask.update({
              where: { id: existingPartnerId },
              data: { correspondingTaskId: null },
            });
          }
        }

        // 2. Link the new task to the target (Bidirectional)
        // A -> B
        await tx.masterTask.update({
          where: { id: newTask.id },
          data: { correspondingTaskId },
        });
        // B -> A
        await tx.masterTask.update({
          where: { id: correspondingTaskId },
          data: { correspondingTaskId: newTask.id },
        });
      }
    });
  } catch (error) {
    console.error("Failed to create master task:", error);
    return {
      success: false,
      error: "Database Error: Failed to create master task.",
    };
  }

  revalidatePath("/master-tasks");
  return { success: true };
}

export async function getMasterTasks(): Promise<ActionResponse<MasterTaskWithRelations[]>> {
  try {
    const tasks = await prisma.masterTask.findMany({
      orderBy: { name: "asc" },
      include: {
        correspondingTask: true,
        correspondingTaskOf: true,
      },
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error("Failed to fetch master tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getMasterTask(id: number): Promise<ActionResponse<MasterTaskWithRelations>> {
  try {
    const task = await prisma.masterTask.findUnique({
      where: { id },
      include: {
        correspondingTask: true,
        correspondingTaskOf: true,
      },
    });
    if (!task) return { success: false, error: "Task not found" };
    return { success: true, data: task };
  } catch (error) {
    console.error("Failed to fetch master task:", error);
    return { success: false, error: "Failed to fetch task" };
  }
}

export async function updateMasterTask(id: number, data: MasterTaskInput): Promise<ActionResponse<void>> {
  const result = masterTaskSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: "Validation error",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const {
      name,
      description,
      type,
      duration,
      color,
      isCashConfirmed,
      requiresWorkingHours,
      shortName,
      correspondingTaskId: newPartnerId,
    } = result.data;

    await prisma.$transaction(async (tx) => {
      // 1. Update basic fields
      await tx.masterTask.update({
        where: { id },
        data: {
          name,
          description,
          type,
          duration,
          color,
          isCashConfirmed,
          requiresWorkingHours,
          shortName,
        },
      });

      // 2. Handle Relationship Logic
      // Check if correspondingTaskId field is explicitly undefined? No, zod parse returns it as null or number.
      // If it exists in result.data, we process it.

      // Get current state to see if change is needed (optimization + correctness)
      const currentTask = await tx.masterTask.findUnique({
        where: { id },
        include: { correspondingTask: true, correspondingTaskOf: true },
      });

      if (!currentTask) throw new Error("Task not found");

      const oldPartnerId =
        currentTask.correspondingTaskId ?? currentTask.correspondingTaskOf?.id;

      // If partner changed (including if it became null)
      if (newPartnerId !== oldPartnerId) {
        // A. Break Old Links involving this task
        if (oldPartnerId) {
          // We need to clear the link on BOTH sides
          // 1. Clear our link
          await tx.masterTask.update({
            where: { id },
            data: { correspondingTaskId: null },
          });

          // 2. Clear old partner's link
          await tx.masterTask.update({
            where: { id: oldPartnerId },
            data: { correspondingTaskId: null },
          });
        }

        // B. Establish New Link (if needed)
        if (newPartnerId) {
          // 1. Clean New Partner's existing links (Steal)
          const targetTask = await tx.masterTask.findUnique({
            where: { id: newPartnerId },
            include: { correspondingTask: true, correspondingTaskOf: true },
          });

          if (targetTask) {
            const targetsOldPartnerId =
              targetTask.correspondingTaskId ??
              targetTask.correspondingTaskOf?.id;
            if (targetsOldPartnerId) {
              // Break target's old bond
              await tx.masterTask.update({
                where: { id: newPartnerId },
                data: { correspondingTaskId: null },
              });
              await tx.masterTask.update({
                where: { id: targetsOldPartnerId },
                data: { correspondingTaskId: null },
              });
            }
          }

          // 2. Set Bidirectional Link
          // A -> B
          await tx.masterTask.update({
            where: { id },
            data: { correspondingTaskId: newPartnerId },
          });
          // B -> A
          await tx.masterTask.update({
            where: { id: newPartnerId },
            data: { correspondingTaskId: id },
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to update master task:", error);
    return {
      success: false,
      error: "Database Error: Failed to update master task.",
    };
  }

  revalidatePath("/master-tasks");
  return { success: true };
}
