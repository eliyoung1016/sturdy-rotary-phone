"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import {
  type MasterTaskInput,
  masterTaskSchema,
} from "@/lib/schemas/master-task";

export async function createMasterTask(data: MasterTaskInput) {
  const result = masterTaskSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
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
    } = result.data;

    await prisma.masterTask.create({
      data: {
        name,
        description,
        type,
        duration,
        color,
        isCashConfirmed,
        requiresWorkingHours,
      },
    });
  } catch (error) {
    console.error("Failed to create master task:", error);
    return {
      success: false,
      message: "Database Error: Failed to create master task.",
    };
  }

  revalidatePath("/master-tasks");
  return { success: true };
}

export async function getMasterTasks() {
  try {
    const tasks = await prisma.masterTask.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error("Failed to fetch master tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function getMasterTask(id: number) {
  try {
    const task = await prisma.masterTask.findUnique({
      where: { id },
    });
    if (!task) return { success: false, error: "Task not found" };
    return { success: true, data: task };
  } catch (error) {
    console.error("Failed to fetch master task:", error);
    return { success: false, error: "Failed to fetch task" };
  }
}

export async function updateMasterTask(id: number, data: MasterTaskInput) {
  const result = masterTaskSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
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
    } = result.data;

    await prisma.masterTask.update({
      where: { id },
      data: {
        name,
        description,
        type,
        duration,
        color,
        isCashConfirmed,
        requiresWorkingHours,
      },
    });
  } catch (error) {
    console.error("Failed to update master task:", error);
    return {
      success: false,
      message: "Database Error: Failed to update master task.",
    };
  }

  revalidatePath("/master-tasks");
  return { success: true };
}
