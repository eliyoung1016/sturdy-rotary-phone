import type { UseFieldArrayUpdate } from "react-hook-form";

export interface TaskItem {
  tempId: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  // Optional working hours adjustment
  dependsOnTempId?: string | null | undefined;
  dependencyType?: "IMMEDIATE" | "TIME_LAG" | "NO_RELATION";
  dependencyDelay?: number;
  // Others
  [key: string]: any;
}

interface WorkingHours {
  start: string;
  end: string;
}

export function useTaskDependencies(workingHours?: WorkingHours) {
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const getAbsoluteMinutes = (dayOffset: number, timeStr: string = "00:00") => {
    return dayOffset * 24 * 60 + timeToMinutes(timeStr);
  };

  const adjustForWorkingHours = (
    dayOffset: number,
    startTime: string,
    duration: number,
  ): { dayOffset: number; startTime: string } => {
    if (!workingHours) return { dayOffset, startTime };

    const officeStartMins = timeToMinutes(workingHours.start);
    const officeEndMins = timeToMinutes(workingHours.end);
    let startMins = timeToMinutes(startTime);
    const endMins = startMins + duration;

    // If task ends after office hours, push to next day
    if (endMins > officeEndMins) {
      // Push to next day start
      return {
        dayOffset: dayOffset + 1,
        startTime: workingHours.start,
      };
    }

    // If task starts before office hours, move to office start
    if (startMins < officeStartMins) {
      return {
        dayOffset,
        startTime: workingHours.start,
      };
    }

    return { dayOffset, startTime };
  };

  const getDayAndTime = (totalMinutes: number) => {
    const dayOffset = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes - dayOffset * 24 * 60;
    const timeStr = minutesToTime(remainingMinutes);
    return { dayOffset, timeStr };
  };

  const updateDependentTasks = <T extends TaskItem>(
    changedTaskTempId: string,
    timeDelta: number,
    currentTasks: T[],
    update: UseFieldArrayUpdate<any, any>,
    visited = new Set<string>(),
  ) => {
    if (visited.has(changedTaskTempId)) return;
    visited.add(changedTaskTempId);

    const dependentTasks = currentTasks
      .map((t, index) => ({ task: t, index }))
      // Handle both dependsOnTempId (correct field) and dependsOnId (old field) if necessary
      // But we should stick to a consistent field name.
      // TemplateForm used dependsOnTempId. Simulation used dependsOnId (numeric) usually but mapped to tempId strings internally?
      // Let's assume uniform dependsOnTempId.
      .filter(
        ({ task }) =>
          task.dependsOnTempId === changedTaskTempId ||
          (task as any).dependsOnId?.toString() === changedTaskTempId,
      );

    dependentTasks.forEach(({ task: depTask, index: depIndex }) => {
      // If the dependent task has NO_RELATION, do not shift it automatically
      // unless we want to maintain the gap? Use case says "no time relation", so assume we don't propagate.
      if (depTask.dependencyType === "NO_RELATION") return;

      const currentStart = getAbsoluteMinutes(
        depTask.dayOffset,
        depTask.startTime,
      );
      const newStartTotal = currentStart + timeDelta;
      let { dayOffset, timeStr } = getDayAndTime(newStartTotal);

      // Apply working hours adjustment
      if (workingHours) {
        const adjusted = adjustForWorkingHours(
          dayOffset,
          timeStr,
          depTask.duration,
        );
        dayOffset = adjusted.dayOffset;
        timeStr = adjusted.startTime;
      }

      const updatedTask = {
        ...currentTasks[depIndex],
        dayOffset,
        startTime: timeStr,
      };

      currentTasks[depIndex] = updatedTask;
      update(depIndex, updatedTask);

      updateDependentTasks(
        depTask.tempId,
        timeDelta,
        currentTasks,
        update,
        visited,
      );
    });
  };

  const enforceDependencyConstraint = <T extends TaskItem>(
    childIndex: number,
    parentId: string,
    currentTasks: T[],
    update: UseFieldArrayUpdate<any, any>,
  ) => {
    const childTask = currentTasks[childIndex];

    // 1. Check dependency type
    if (childTask.dependencyType === "NO_RELATION") return;

    const parentTask = currentTasks.find((t) => t.tempId === parentId);
    if (!parentTask) return;

    const parentStart = getAbsoluteMinutes(
      parentTask.dayOffset,
      parentTask.startTime,
    );
    const parentEnd = parentStart + (parentTask.duration || 0);

    const childStart = getAbsoluteMinutes(
      childTask.dayOffset,
      childTask.startTime,
    );

    // Calculate required start time based on delay
    // IMMEDIATE = 0 delay effectively
    const requiredDelay =
      childTask.dependencyType === "TIME_LAG"
        ? childTask.dependencyDelay || 0
        : 0;
    const requiredStart = parentEnd + requiredDelay;

    if (childStart < requiredStart) {
      let { dayOffset, timeStr } = getDayAndTime(requiredStart);

      // Apply working hours adjustment
      if (workingHours) {
        const adjusted = adjustForWorkingHours(
          dayOffset,
          timeStr,
          childTask.duration,
        );
        dayOffset = adjusted.dayOffset;
        timeStr = adjusted.startTime;
      }

      const newChildTask = {
        ...childTask,
        dayOffset,
        startTime: timeStr,
      };

      currentTasks[childIndex] = newChildTask;
      update(childIndex, newChildTask);

      const delta = requiredStart - childStart;
      updateDependentTasks(childTask.tempId, delta, currentTasks, update);
    }
  };

  return {
    getAbsoluteMinutes,
    getDayAndTime,
    updateDependentTasks,
    enforceDependencyConstraint,
    adjustForWorkingHours,
  };
}
