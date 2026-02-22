import { create } from 'zustand'
import type { TaskItem, WorkingHours } from '@/types/simulation'

interface SimulationState {
    currentTasks: TaskItem[]
    targetTasks: TaskItem[]
    mode: 'current' | 'target'
    workingHours: WorkingHours

    // Actions
    setMode: (mode: 'current' | 'target') => void
    setTasks: (mode: 'current' | 'target', tasks: TaskItem[]) => void
    setWorkingHours: (hours: WorkingHours) => void

    // High-level task operations
    updateTaskDuration: (tempId: string, newDuration: number) => void
    moveTask: (tempId: string, dayOffset: number, startTime: string) => void

    // internal helpers exposed for testing/advanced usage
    _getActiveTasks: () => TaskItem[]
}

// Helpers from useTaskDependencies
const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const getAbsoluteMinutes = (dayOffset: number, timeStr: string = "00:00") => {
    return dayOffset * 24 * 60 + timeToMinutes(timeStr);
};

const getDayAndTime = (totalMinutes: number) => {
    const dayOffset = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes - dayOffset * 24 * 60;
    const timeStr = minutesToTime(remainingMinutes);
    return { dayOffset, timeStr };
};

const adjustForWorkingHours = (
    dayOffset: number,
    startTime: string,
    duration: number,
    workingHours: WorkingHours,
    isResizing: boolean = false
) => {
    const { start, end } = workingHours;
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    const timeMins = timeToMinutes(startTime);

    if (timeMins < startMins) return { dayOffset, startTime: start };
    if (timeMins >= endMins) return { dayOffset: dayOffset + 1, startTime: start };

    if (!isResizing) {
        const taskEndMins = timeMins + duration;
        if (taskEndMins > endMins) return { dayOffset: dayOffset + 1, startTime: start };
    }

    return { dayOffset, startTime };
};

// Core Dependency Calculator
const recalculateDependentTasks = (
    changedTaskTempId: string,
    tasks: TaskItem[],
    workingHours: WorkingHours
): TaskItem[] => {
    const adjacencyMap = new Map<string, number[]>();
    tasks.forEach((t, idx) => {
        const parentId = t.dependsOnTempId || (t as any).dependsOnId?.toString();
        if (parentId) {
            const children = adjacencyMap.get(parentId) || [];
            children.push(idx);
            adjacencyMap.set(parentId, children);
        }
    });

    const queue: string[] = [changedTaskTempId];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const parentTempId = queue.shift()!;
        if (visited.has(parentTempId)) continue;
        visited.add(parentTempId);

        const parentIndex = tasks.findIndex((t) => t.tempId === parentTempId);
        if (parentIndex === -1) continue;

        const parentTask = tasks[parentIndex];
        const parentStart = getAbsoluteMinutes(parentTask.dayOffset, parentTask.startTime);
        const parentEnd = parentStart + (parentTask.duration || 0);

        const childrenIndices = adjacencyMap.get(parentTempId);
        if (!childrenIndices) continue;

        childrenIndices.forEach((childIndex) => {
            const childTask = tasks[childIndex];
            if (childTask.dependencyType === "NO_RELATION") return;

            const requiredDelay = childTask.dependencyType === "TIME_LAG" ? childTask.dependencyDelay || 0 : 0;
            const newStartTotal = parentEnd + requiredDelay;
            const currentChildStart = getAbsoluteMinutes(childTask.dayOffset, childTask.startTime);

            if (currentChildStart !== newStartTotal) {
                let { dayOffset, timeStr } = getDayAndTime(newStartTotal);

                if (childTask.requiresWorkingHours) {
                    const adjusted = adjustForWorkingHours(dayOffset, timeStr, childTask.duration, workingHours);
                    dayOffset = adjusted.dayOffset;
                    timeStr = adjusted.startTime;
                }

                tasks[childIndex] = { ...childTask, dayOffset, startTime: timeStr };
                queue.push(childTask.tempId);
            }
        });
    }
    return tasks;
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
    currentTasks: [],
    targetTasks: [],
    mode: 'current',
    workingHours: { start: '09:00', end: '17:00' },

    _getActiveTasks: () => get().mode === 'current' ? get().currentTasks : get().targetTasks,

    setMode: (mode) => set({ mode }),

    setTasks: (mode, tasks) => set(state => ({
        ...state,
        [mode === 'current' ? 'currentTasks' : 'targetTasks']: tasks
    })),

    setWorkingHours: (hours) => set({ workingHours: hours }),

    updateTaskDuration: (tempId, newDuration) => set(state => {
        const activeKey = state.mode === 'current' ? 'currentTasks' : 'targetTasks';
        let tasks = [...state[activeKey]];
        const taskIndex = tasks.findIndex(t => t.tempId === tempId);
        if (taskIndex === -1) return state;

        tasks[taskIndex] = { ...tasks[taskIndex], duration: newDuration };
        tasks = recalculateDependentTasks(tempId, tasks, state.workingHours);

        return { ...state, [activeKey]: tasks };
    }),

    moveTask: (tempId, newDayOffset, newStartTime) => set(state => {
        const activeKey = state.mode === 'current' ? 'currentTasks' : 'targetTasks';
        let tasks = [...state[activeKey]];
        const taskIndex = tasks.findIndex(t => t.tempId === tempId);
        if (taskIndex === -1) return state;

        const task = tasks[taskIndex];
        const newStartTotal = getAbsoluteMinutes(newDayOffset, newStartTime);
        const parentId = task.dependsOnTempId || task.dependsOnId?.toString();

        if (parentId) {
            const parentTask = tasks.find(t => t.tempId === parentId);
            if (parentTask) {
                const parentStart = getAbsoluteMinutes(parentTask.dayOffset, parentTask.startTime);
                const parentEnd = parentStart + (parentTask.duration || 0);

                if (newStartTotal < parentEnd) {
                    // Snap to parent constraint
                    const { dayOffset, timeStr } = getDayAndTime(parentEnd);
                    tasks[taskIndex] = {
                        ...task, dayOffset, startTime: timeStr,
                        dependencyType: "IMMEDIATE", dependencyDelay: 0
                    };
                } else {
                    // Valid move
                    const delay = newStartTotal - parentEnd;
                    tasks[taskIndex] = {
                        ...task, dayOffset: newDayOffset, startTime: newStartTime,
                        dependencyType: delay > 0 ? "TIME_LAG" : "IMMEDIATE", dependencyDelay: delay
                    };
                }
            }
        } else {
            tasks[taskIndex] = { ...task, dayOffset: newDayOffset, startTime: newStartTime };
        }

        if (tasks[taskIndex].requiresWorkingHours) {
            const adjusted = adjustForWorkingHours(
                tasks[taskIndex].dayOffset,
                tasks[taskIndex].startTime,
                tasks[taskIndex].duration,
                state.workingHours
            );
            tasks[taskIndex] = { ...tasks[taskIndex], dayOffset: adjusted.dayOffset, startTime: adjusted.startTime };
        }

        tasks = recalculateDependentTasks(tempId, tasks, state.workingHours);

        return { ...state, [activeKey]: tasks };
    }),
}))
