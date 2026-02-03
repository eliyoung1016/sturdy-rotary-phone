import { useCallback } from "react";
import type { TaskItem, WorkingHours } from "@/types/simulation";

export function useTaskDependencies(workingHours?: WorkingHours) {
  const timeToMinutes = useCallback((timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  const minutesToTime = useCallback((mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const getAbsoluteMinutes = useCallback(
    (dayOffset: number, timeStr: string = "00:00") => {
      return dayOffset * 24 * 60 + timeToMinutes(timeStr);
    },
    [timeToMinutes],
  );

  const adjustForWorkingHours = useCallback(
    (
      dayOffset: number,
      startTime: string,
      duration: number,
    ): { dayOffset: number; startTime: string } => {
      if (!workingHours) return { dayOffset, startTime };

      const { start, end } = workingHours;
      const startMins = timeToMinutes(start);
      const endMins = timeToMinutes(end);
      const timeMins = timeToMinutes(startTime);

      // 1. If start time is before office start, move to office start
      if (timeMins < startMins) {
        return { dayOffset, startTime: start };
      }

      // 2. If start time is after office end, move to next day office start
      if (timeMins >= endMins) {
        return { dayOffset: dayOffset + 1, startTime: start };
      }

      // 3. New Rule: If task fits but extends beyond office end, push to next day
      // Calculate end time of the task
      const taskEndMins = timeMins + duration;

      // If the task ends after the office end, it must be pushed to the next day
      // Note: This logic moves the ENTIRE task to the next day if it doesn't fit.
      // Assuming we want to start at the beginning of the next working day.
      if (taskEndMins > endMins) {
        return { dayOffset: dayOffset + 1, startTime: start };
      }

      return { dayOffset, startTime };
    },
    [workingHours, timeToMinutes],
  );

  const getDayAndTime = useCallback(
    (totalMinutes: number) => {
      const dayOffset = Math.floor(totalMinutes / (24 * 60));
      const remainingMinutes = totalMinutes - dayOffset * 24 * 60;
      const timeStr = minutesToTime(remainingMinutes);
      return { dayOffset, timeStr };
    },
    [minutesToTime],
  );

  // Recursively update dependent tasks based on parent's new state
  // Optimized to build a dependency graph once and traverse it
  const recalculateDependentTasks = useCallback(
    <T extends TaskItem>(
      changedTaskTempId: string, // The ID of the task that changed (parent)
      currentTasks: T[],
    ): T[] => {
      // 1. Build adjacency list (parent -> [children indices])
      // This turns the lookup from O(N) per recursion to O(1)
      const adjacencyMap = new Map<string, number[]>();
      currentTasks.forEach((t, idx) => {
        const parentId =
          t.dependsOnTempId || (t as any).dependsOnId?.toString();
        if (parentId) {
          const children = adjacencyMap.get(parentId) || [];
          children.push(idx);
          adjacencyMap.set(parentId, children);
        }
      });

      // 2. Queue for BFS traversal (or stack for DFS)
      // We want to process updates in dependency order.
      // Since we are propagating changes locally, a simple queue works.
      const queue: string[] = [changedTaskTempId];
      const visited = new Set<string>();

      // We maintain a working copy if necessary, but we are mutating currentTasks elements if they are objects.
      // However, for React state immutability, we should probably be careful.
      // The calling code typically does `const tasks = [...current]` or similar.
      // Modifying objects inside the array is fine if the array itself was cloned shallowly
      // AND we clone the objects we modify.

      while (queue.length > 0) {
        const parentTempId = queue.shift()!;

        if (visited.has(parentTempId)) continue;
        visited.add(parentTempId);

        const parentIndex = currentTasks.findIndex(
          (t) => t.tempId === parentTempId,
        );
        if (parentIndex === -1) continue;

        const parentTask = currentTasks[parentIndex];
        const parentStart = getAbsoluteMinutes(
          parentTask.dayOffset,
          parentTask.startTime,
        );
        const parentEnd = parentStart + (parentTask.duration || 0);

        // Get children using map
        const childrenIndices = adjacencyMap.get(parentTempId);
        if (!childrenIndices) continue;

        childrenIndices.forEach((childIndex) => {
          const childTask = currentTasks[childIndex];

          if (childTask.dependencyType === "NO_RELATION") return;

          const requiredDelay =
            childTask.dependencyType === "TIME_LAG"
              ? childTask.dependencyDelay || 0
              : 0;

          const newStartTotal = parentEnd + requiredDelay;

          const currentChildStart = getAbsoluteMinutes(
            childTask.dayOffset,
            childTask.startTime,
          );

          if (currentChildStart !== newStartTotal) {
            let { dayOffset, timeStr } = getDayAndTime(newStartTotal);

            if (workingHours && childTask.requiresWorkingHours) {
              const adjusted = adjustForWorkingHours(
                dayOffset,
                timeStr,
                childTask.duration,
              );
              dayOffset = adjusted.dayOffset;
              timeStr = adjusted.startTime;
            }

            // Update the task in the array (shallow copy the object)
            currentTasks[childIndex] = {
              ...childTask,
              dayOffset,
              startTime: timeStr,
            };

            // Add child to queue to propagate further
            queue.push(childTask.tempId);
          }
        });
      }

      return currentTasks;
    },
    [getAbsoluteMinutes, getDayAndTime, workingHours, adjustForWorkingHours],
  );

  // Handle manual move of a task:
  // 1. Update its relationship with parent (update delay)
  // 2. Cascade changes to children
  const updateTaskOnMove = useCallback(
    <T extends TaskItem>(
      taskIndex: number,
      newDayOffset: number,
      newStartTime: string,
      currentTasks: T[],
    ): T[] => {
      const task = currentTasks[taskIndex];
      if (!task) return currentTasks;

      const newStartTotal = getAbsoluteMinutes(newDayOffset, newStartTime);

      // 1. Check parent constraint
      const parentId = task.dependsOnTempId || task.taskId?.toString();
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

      // 2. Apply working hours adjustment if needed
      if (workingHours && currentTasks[taskIndex].requiresWorkingHours) {
        const adjusted = adjustForWorkingHours(
          currentTasks[taskIndex].dayOffset,
          currentTasks[taskIndex].startTime,
          currentTasks[taskIndex].duration,
        );
        currentTasks[taskIndex] = {
          ...currentTasks[taskIndex],
          dayOffset: adjusted.dayOffset,
          startTime: adjusted.startTime,
        };
      }

      // 3. Cascade to children
      return recalculateDependentTasks(task.tempId, currentTasks);
    },
    [
      getAbsoluteMinutes,
      getDayAndTime,
      recalculateDependentTasks,
      workingHours,
      adjustForWorkingHours,
    ],
  );

  // Re-export this for when duration changes etc
  const updateDependentTasks = useCallback(
    (
      changedTaskTempId: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _timeDelta: number,
      currentTasks: TaskItem[],
    ) => {
      // Ignore delta, perform full path recalculation
      return recalculateDependentTasks(changedTaskTempId, currentTasks);
    },
    [recalculateDependentTasks],
  );

  const enforceDependencyConstraint = useCallback(
    <T extends TaskItem>(
      childIndex: number,
      parentId: string,
      currentTasks: T[],
    ) => {
      recalculateDependentTasks(parentId, currentTasks);
    },
    [recalculateDependentTasks],
  );

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
