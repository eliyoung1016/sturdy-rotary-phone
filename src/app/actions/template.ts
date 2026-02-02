"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { type TemplateInput, templateSchema } from "@/lib/schemas/template";

export async function createTemplate(data: TemplateInput) {
  const result = templateSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { name, description, tasks } = result.data;

    // Transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Create the Template
      const template = await tx.template.create({
        data: {
          name,
          description,
        },
      });

      // Map tempId to real TemplateTask ID
      const tempIdToTemplateTaskId = new Map<string, number>();

      // 2. Create TemplateTasks (without dependencies first)
      const createdTasks = [];
      for (const task of tasks) {
        let masterTaskId = task.taskId;

        // Handle Save to Master Logic
        if (!masterTaskId && task.saveToMaster) {
          const newMasterTask = await tx.masterTask.create({
            data: {
              name: task.name,
              duration: task.duration,
              type: task.type || "PROCESS",
              color: task.color || "primary",
              isCashConfirmed: task.isCashConfirmed,
              requiresWorkingHours: task.requiresWorkingHours,
            },
          });
          masterTaskId = newMasterTask.id;
        }

        const templateTask = await tx.templateTask.create({
          data: {
            templateId: template.id,
            taskId: masterTaskId,
            name: task.name,
            duration: task.duration,
            sequenceOrder: task.sequenceOrder,
            dayOffset: task.dayOffset,
            startTime: task.startTime,
            type: task.type || "PROCESS",
            color: task.color || "primary",
            isCashConfirmed: task.isCashConfirmed,
            requiresWorkingHours: task.requiresWorkingHours,
            dependencyType: task.dependencyType || "IMMEDIATE",
            dependencyDelay: task.dependencyDelay || 0,
          },
        });
        tempIdToTemplateTaskId.set(task.tempId, templateTask.id);
        createdTasks.push({ ...task, dbId: templateTask.id });
      }

      // 3. Update Dependencies
      for (const task of createdTasks) {
        if (task.dependsOnTempId) {
          const parentId = tempIdToTemplateTaskId.get(task.dependsOnTempId);
          if (parentId) {
            await tx.templateTask.update({
              where: { id: task.dbId },
              data: { dependsOnId: parentId },
            });
          }
        }
      }
    });
  } catch (error) {
    console.error("Failed to create template:", error);
    return {
      success: false,
      message: "Database Error: Failed to create template.",
    };
  }

  revalidatePath("/templates");
  return { success: true };
}

export async function getTemplate(id: number) {
  try {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        templateTasks: {
          orderBy: { sequenceOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Transform for UI if necessary (e.g. mapping fields)
    // The TemplateForm expects TemplateTaskInput structure mostly.
    // We might need to map it back to match the form's expectation.
    const tasks = template.templateTasks.map((t) => ({
      tempId: crypto.randomUUID(), // Generate new tempIds for the form state
      dbId: t.id,
      taskId: t.taskId,
      name: t.name,
      duration: t.duration,
      sequenceOrder: t.sequenceOrder,
      dayOffset: t.dayOffset,
      startTime: t.startTime || "09:00",
      type: t.type as "PROCESS" | "CUTOFF",
      color: t.color || "primary",
      isCashConfirmed: t.isCashConfirmed,
      requiresWorkingHours: t.requiresWorkingHours,
      dependsOnTempId: undefined as string | undefined, // mapped later
      dependsOnId: t.dependsOnId,
      dependencyType:
        (t.dependencyType as "IMMEDIATE" | "TIME_LAG" | "NO_RELATION") ||
        "IMMEDIATE",
      dependencyDelay: t.dependencyDelay || 0,
      saveToMaster: false,
    }));

    // Re-map dependencies using tempIds
    const dbIdToTempId = new Map(tasks.map((t) => [t.dbId, t.tempId]));
    tasks.forEach((t) => {
      if (t.dependsOnId) {
        t.dependsOnTempId = dbIdToTempId.get(t.dependsOnId);
      }
    });

    return {
      success: true,
      data: {
        ...template,
        tasks,
      },
    };
  } catch (error) {
    console.error("Failed to get template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

export async function updateTemplate(id: number, data: TemplateInput) {
  const result = templateSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { name, description, tasks } = result.data;

    await prisma.$transaction(async (tx) => {
      // 1. Update Template Details
      await tx.template.update({
        where: { id },
        data: { name, description },
      });

      // 2. Handle Tasks
      // Strategy: Delete all existing tasks and recreate them.
      // This is simpler for managing reordering and dependency chains than trying to diff updates.
      // However, it destroys history if we cared about Task IDs (which we might not for templates).
      // Given the complexity of dependencies, full replacement is safest for correctness.

      await tx.templateTask.deleteMany({
        where: { templateId: id },
      });

      // Map tempId to real TemplateTask ID
      const tempIdToTemplateTaskId = new Map<string, number>();

      const createdTasks = [];
      for (const task of tasks) {
        let masterTaskId = task.taskId;

        // Handle Save to Master Logic
        if (!masterTaskId && task.saveToMaster) {
          const newMasterTask = await tx.masterTask.create({
            data: {
              name: task.name,
              duration: task.duration,
              type: task.type || "PROCESS",
              color: task.color || "primary",
              isCashConfirmed: task.isCashConfirmed,
              requiresWorkingHours: task.requiresWorkingHours,
            },
          });
          masterTaskId = newMasterTask.id;
        }

        const templateTask = await tx.templateTask.create({
          data: {
            templateId: id,
            taskId: masterTaskId, // Can be null for custom tasks
            name: task.name,
            duration: task.duration,
            sequenceOrder: task.sequenceOrder,
            dayOffset: task.dayOffset,
            startTime: task.startTime,
            type: task.type || "PROCESS",
            color: task.color || "primary",
            isCashConfirmed: task.isCashConfirmed,
            requiresWorkingHours: task.requiresWorkingHours,
            dependencyType: task.dependencyType || "IMMEDIATE",
            dependencyDelay: task.dependencyDelay || 0,
          },
        });
        tempIdToTemplateTaskId.set(task.tempId, templateTask.id);
        createdTasks.push({ ...task, dbId: templateTask.id });
      }

      // 3. Update Dependencies
      for (const task of createdTasks) {
        if (task.dependsOnTempId) {
          const parentId = tempIdToTemplateTaskId.get(task.dependsOnTempId);
          if (parentId) {
            await tx.templateTask.update({
              where: { id: task.dbId },
              data: { dependsOnId: parentId },
            });
          }
        }
      }
    });

    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update template:", error);
    return {
      success: false,
      message: "Database Error: Failed to update template.",
    };
  }
}

export async function deleteTemplate(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      // Delete dependent template tasks first
      await tx.templateTask.deleteMany({
        where: { templateId: id },
      });

      await tx.template.delete({
        where: { id },
      });
    });

    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}
