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
    // Disabled office hour limitation as per user request
    return { dayOffset, startTime };
  };

  const getDayAndTime = (totalMinutes: number) => {
    const dayOffset = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes - dayOffset * 24 * 60;
    const timeStr = minutesToTime(remainingMinutes);
    return { dayOffset, timeStr };
  };

  // Recurvsively update dependent tasks based on parent's new state
  const recalculateDependentTasks = <T extends TaskItem>(
    changedTaskTempId: string, // The ID of the task that changed (parent)
    currentTasks: T[],
    visited = new Set<string>(),
  ): T[] => {
    if (visited.has(changedTaskTempId)) return currentTasks;
    visited.add(changedTaskTempId);

    const parentTask = currentTasks.find((t) => t.tempId === changedTaskTempId);
    if (!parentTask) return currentTasks;

    const parentStart = getAbsoluteMinutes(
      parentTask.dayOffset,
      parentTask.startTime,
    );
    const parentEnd = parentStart + (parentTask.duration || 0);

    // Find children
    const dependentTasks = currentTasks
      .map((t, index) => ({ task: t, index }))
      .filter(
        ({ task }) =>
          task.dependsOnTempId === changedTaskTempId ||
          (task as any).dependsOnId?.toString() === changedTaskTempId,
      );

    dependentTasks.forEach(({ task: childTask, index: childIndex }) => {
      if (childTask.dependencyType === "NO_RELATION") return;

      const requiredDelay =
        childTask.dependencyType === "TIME_LAG"
          ? childTask.dependencyDelay || 0
          : 0;

      const newStartTotal = parentEnd + requiredDelay;

      // Check if update is needed
      const currentChildStart = getAbsoluteMinutes(
        childTask.dayOffset,
        childTask.startTime,
      );

      if (currentChildStart !== newStartTotal) {
        let { dayOffset, timeStr } = getDayAndTime(newStartTotal);

        if (workingHours) {
          const adjusted = adjustForWorkingHours(
            dayOffset,
            timeStr,
            childTask.duration,
          );
          dayOffset = adjusted.dayOffset;
          timeStr = adjusted.startTime;
        }

        const updatedTask = {
          ...currentTasks[childIndex],
          dayOffset,
          startTime: timeStr,
        };
        currentTasks[childIndex] = updatedTask;

        // Recurse
        recalculateDependentTasks(childTask.tempId, currentTasks, visited);
      }
    });

    return currentTasks;
  };

  // Handle manual move of a task:
  // 1. Update its relationship with parent (update delay)
  // 2. Cascade changes to children
  const updateTaskOnMove = <T extends TaskItem>(
    taskIndex: number,
    newDayOffset: number,
    newStartTime: string,
    currentTasks: T[],
  ): T[] => {
    const task = currentTasks[taskIndex];
    if (!task) return currentTasks;

    const newStartTotal = getAbsoluteMinutes(newDayOffset, newStartTime);

    // 1. Check parent constraint
    const parentId = task.dependsOnTempId || (task as any).dependsOnId;
    if (parentId) {
      const parentTask = currentTasks.find((t) => t.tempId === parentId);
      if (parentTask) {
        const parentStart = getAbsoluteMinutes(
          parentTask.dayOffset,
          parentTask.startTime,
        );
        const parentEnd = parentStart + (parentTask.duration || 0);

        if (newStartTotal < parentEnd) {
          // Constraint violation: tried to move before parent ends.
          // Snap to parent end.
          const { dayOffset, timeStr } = getDayAndTime(parentEnd);

          // Update task to snap
          currentTasks[taskIndex] = {
            ...task,
            dayOffset,
            startTime: timeStr,
            dependencyType: "IMMEDIATE",
            dependencyDelay: 0,
          };

          // Since we effectively "moved" it to a valid spot, we propagate from there
          // Recurse to children
          return recalculateDependentTasks(task.tempId, currentTasks);
        } else {
          // Valid move (after parent end)
          // Update delay
          const delay = newStartTotal - parentEnd;
          currentTasks[taskIndex] = {
            ...task,
            dayOffset: newDayOffset,
            startTime: newStartTime,
            dependencyType: delay > 0 ? "TIME_LAG" : "IMMEDIATE",
            dependencyDelay: delay,
          };
        }
      } else {
        // Parent not found, just update
        currentTasks[taskIndex] = {
          ...task,
          dayOffset: newDayOffset,
          startTime: newStartTime,
        };
      }
    } else {
      // No parent, straight update
      currentTasks[taskIndex] = {
        ...task,
        dayOffset: newDayOffset,
        startTime: newStartTime,
      };
    }

    // 2. Cascade to children
    return recalculateDependentTasks(task.tempId, currentTasks);
  };

  // Re-export this for when duration changes etc
  const updateDependentTasks = (
    changedTaskTempId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _timeDelta: number,
    currentTasks: any[],
  ) => {
    // Ignore delta, perform full path recalculation
    return recalculateDependentTasks(changedTaskTempId, currentTasks);
  };

  const enforceDependencyConstraint = <T extends TaskItem>(
    childIndex: number,
    parentId: string,
    currentTasks: T[],
  ) => {
    recalculateDependentTasks(parentId, currentTasks);
  };

  return {
    getAbsoluteMinutes,
    getDayAndTime,
    updateDependentTasks,
    enforceDependencyConstraint,
    adjustForWorkingHours,
    updateTaskOnMove,
    recalculateDependentTasks,
  };
}
