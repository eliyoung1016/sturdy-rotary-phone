"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { DependencyPopover } from "@/components/shared/dependency-popover";
import { TaskRow } from "@/components/simulation/task-row";
import { Button } from "@/components/ui/button";
import { useSimulationStore } from "@/store/simulation-store";
import { cn } from "@/lib/utils";
import type { MasterTask, TaskItem } from "@/types/simulation";

interface TaskListEditorProps {
  tasks: TaskItem[];
  masterTasks: MasterTask[];
  onAddEmptyTask?: () => void;
  className?: string;
  readOnly?: boolean;
}

export function TaskListEditor({
  tasks: passedTasks,
  masterTasks,
  onAddEmptyTask,
  className,
  readOnly = false,
}: TaskListEditorProps) {
  const { mode, setTasks, workingHours, _getActiveTasks } = useSimulationStore();
  // We use the actively passed tasks so that we're reacting to the component tree updates,
  // but we edit via Zustand
  const tasksToRender = passedTasks || [];

  // Need logic for DependencyPopover recalculations as well!
  // It relies on recalculateDependentTasks.
  // Because TaskRow also needs these helpers, we should proxy the shared logic 
  // from our Zustand store... Although wait, the store manages this globally now.

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dndContextId = useId();

  // Shared Popover State
  const [activeDepPopover, setActiveDepPopover] = useState<{
    tempId: string;
    anchor: HTMLElement | null;
  } | null>(null);

  const handleOpenDependency = useCallback(
    (tempId: string, anchor: HTMLElement) => {
      setActiveDepPopover({ tempId, anchor });
    },
    [],
  );

  const handleClosePopovers = useCallback(() => {
    setActiveDepPopover(null);
  }, []);

  const activeDepTask = activeDepPopover
    ? (tasksToRender.find((t) => t.tempId === activeDepPopover.tempId) || null)
    : null;

  const handleDependencyUpdate = useCallback(
    (updates: Partial<TaskItem>) => {
      setActiveDepPopover((prev) => {
        if (!prev) return null;
        const { tempId } = prev;
        const state = useSimulationStore.getState();
        const currentTasks = [...state._getActiveTasks()];
        const index = currentTasks.findIndex((t: any) => t.tempId === tempId);

        if (index === -1) return prev;

        // Update local task
        currentTasks[index] = {
          ...currentTasks[index],
          ...updates,
        };

        // To keep it simple, if dependency data changes, we trigger
        // a full recalculation. Wait, recalculateDependentTasks is internal to the store.
        // Let's implement a wrapper here or move it.
        // Actually, we can just push the new list and let the store or component handle it?
        // Let's just update the specific task first, then call a trigger in the store?
        // For now, update the task in the store.
        const store = useSimulationStore.getState();
        const updatedList = [...currentTasks];
        updatedList[index] = { ...updatedList[index], ...updates };
        store.setTasks(store.mode, updatedList);

        // We'll need to trigger a move update for dependencies to refresh
        store.moveTask(tempId, updatedList[index].dayOffset, updatedList[index].startTime);

        return prev;
      });
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const store = useSimulationStore.getState();
        const currentItems = [...store._getActiveTasks()];
        const oldIndex = currentItems.findIndex(
          (i: any) => i.tempId === active.id,
        );
        const newIndex = currentItems.findIndex(
          (i: any) => i.tempId === over.id,
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const item = currentItems.splice(oldIndex, 1)[0];
          currentItems.splice(newIndex, 0, item);
          store.setTasks(store.mode, currentItems);
        }
      }
    },
    [],
  ); // Stable

  const handleAddEmptyTask = useCallback(() => {
    if (onAddEmptyTask) {
      onAddEmptyTask();
    } else {
      const store = useSimulationStore.getState();
      const currentVals = store._getActiveTasks();
      const usedTaskIds = new Set(
        currentVals
          .map((t: any) => t.taskId)
          .filter((id: any) => id !== undefined),
      );
      const firstUnusedMaster = masterTasks.find(
        (mt) => !usedTaskIds.has(mt.id),
      );
      const defaultMaster = firstUnusedMaster || masterTasks[0];

      const newTask = {
        tempId: crypto.randomUUID(),
        taskId: defaultMaster?.id,
        name: defaultMaster?.name || "",
        shortName: defaultMaster?.shortName,
        duration: defaultMaster?.duration || 0,
        dayOffset: 0,
        startTime: "09:00",
        type: defaultMaster?.type || "PROCESS",
        color: defaultMaster?.color || "primary",
        isCashConfirmed: defaultMaster?.isCashConfirmed || false,
        requiresWorkingHours: defaultMaster?.requiresWorkingHours || false,
        dependsOnTempId: undefined,
        saveToMaster: false,
      };
      // We manually append
      store.setTasks(store.mode, [...currentVals, newTask as TaskItem]);
    }
  }, [onAddEmptyTask, masterTasks]);

  if (readOnly && tasksToRender.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border rounded-md bg-white shadow-sm">
        No tasks to display.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {!readOnly && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button type="button" onClick={handleAddEmptyTask} size="sm">
            <Plus className="mr-2 h-3 w-3" /> Add Task
          </Button>
        </div>
      )}

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-[30px_1fr_100px_280px_0.9fr_90px_30px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
          <div></div>
          <div className="pl-1">Task Name</div>
          <div>Type</div>
          <div>Timing</div>
          <div>Depends On</div>
          <div className="text-center">Attributes</div>
          <div className="text-right"></div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tasksToRender.map((f: any) => f.tempId)}
              strategy={verticalListSortingStrategy}
            >
              {tasksToRender.map((field: any, index) => (
                <TaskRow
                  key={field.tempId}
                  id={field.tempId}
                  index={index}
                  task={field}
                  masterTasks={masterTasks}
                  readOnly={readOnly}
                  onOpenDependency={handleOpenDependency}
                />
              ))}
            </SortableContext>
          </DndContext>
          {tasksToRender.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks added. Click "Add Task" to start.
            </div>
          )}
        </div>
      </div>

      <DependencyPopover
        isOpen={!!activeDepPopover}
        onClose={handleClosePopovers}
        anchorEl={activeDepPopover?.anchor ?? null}
        task={activeDepTask}
        allTasks={tasksToRender}
        onUpdate={handleDependencyUpdate}
      />
    </div>
  );
}
