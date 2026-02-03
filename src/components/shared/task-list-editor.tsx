"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState, useId, useCallback, useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  SharedColorPopover,
  SharedDependencyPopover,
} from "@/components/simulation/shared-popovers";
import { TaskRow } from "@/components/simulation/task-row";
import { Button } from "@/components/ui/button";
import { useTaskDependencies } from "@/hooks/use-task-dependencies";
import { cn } from "@/lib/utils";
import type { MasterTask, TaskItem } from "@/types/simulation";

interface TaskListEditorProps {
  name: string; // Field array name (e.g., "tasks")
  masterTasks: MasterTask[];
  onAddEmptyTask?: () => void;
  className?: string;
  readOnly?: boolean;
  workingHours?: { start: string; end: string };
}

export function TaskListEditor({
  name,
  masterTasks,
  onAddEmptyTask,
  className,
  readOnly = false,
  workingHours,
}: TaskListEditorProps) {
  const { control, getValues, watch } = useFormContext();
  const { fields, append, remove, update, move, replace } = useFieldArray({
    control,
    name,
  });

  // Watch all tasks to build the dependency map.
  // Using watch with a field array name usually returns the full array.
  // We need this for the `TaskRow` to know parent names without 0(N^2) hook calls/lookups inside render.
  const allTasks = watch(name);

  // Pre-calculate tempId -> Name map for O(1) lookup in TaskRow
  // We memoize this map so it only recalculates when tasks change
  const taskNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(allTasks)) {
      allTasks.forEach((t: TaskItem) => {
        if (t.tempId) {
          map.set(t.tempId, t.name);
        }
      });
    }
    return map;
  }, [allTasks]);

  const { updateTaskOnMove, recalculateDependentTasks } =
    useTaskDependencies(workingHours);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dndContextId = useId();

  // Shared Popover State
  const [activeColorPopover, setActiveColorPopover] = useState<{
    tempId: string;
    anchor: HTMLElement | null;
  } | null>(null);

  const [activeDepPopover, setActiveDepPopover] = useState<{
    tempId: string;
    anchor: HTMLElement | null;
  } | null>(null);

  const handleOpenColor = useCallback((tempId: string, anchor: HTMLElement) => {
    setActiveColorPopover({ tempId, anchor });
  }, []);

  const handleOpenDependency = useCallback(
    (tempId: string, anchor: HTMLElement) => {
      setActiveDepPopover({ tempId, anchor });
    },
    [],
  );

  const handleClosePopovers = useCallback(() => {
    setActiveColorPopover(null);
    setActiveDepPopover(null);
  }, []);

  const activeColorTaskIdx = activeColorPopover
    ? fields.findIndex((f: any) => f.tempId === activeColorPopover.tempId)
    : -1;
  const activeColorTask =
    activeColorTaskIdx !== -1
      ? (getValues(`${name}.${activeColorTaskIdx}`) as TaskItem)
      : null;

  const activeDepTaskIdx = activeDepPopover
    ? fields.findIndex((f: any) => f.tempId === activeDepPopover.tempId)
    : -1;
  const activeDepTask =
    activeDepTaskIdx !== -1
      ? (getValues(`${name}.${activeDepTaskIdx}`) as TaskItem)
      : null;

  const handleColorUpdate = useCallback(
    (updates: Partial<TaskItem>) => {
      // We cannot easily close over 'activeColorTaskIdx' because it changes when fields change/sort
      // But we can look it up efficiently or rely on ref if we wanted.
      // However, since this is a callback for a popover that is open, we can just look it up freshly or use a ref-tracking approach.
      // For now, let's keep it simple but acknowledge this function changes when 'fields' changes if we used it directly.
      // Instead we'll rely on the fact that if popover is open, we have `activeColorPopover.tempId`.

      // To make this stable, we probably shouldn't depend on `fields` or `getValues` inside the callback dependency array?
      // Actually `getValues` and `update` are stable from RHF.
      // The state `activeColorPopover` changes.
      // Let's use the functional update pattern or just use the ref/state we have.

      // Actually, `activeColorPopover` is state. If we use it, we depend on it.
      // To fully stabilize, ideally we pass the ID to the updater?
      // The popover calls `onUpdate(updates)`.

      // Let's just trust that `update` and `getValues` are stable, and we need current state.
      // If we want minimal re-renders, this handler changing is less of an issue than the `TaskRow` handlers.
      // `TaskRow` doesn't use `handleColorUpdate`, it uses `onOpenColor`.
      // `handleColorUpdate` is passed to `SharedColorPopover` which is a singleton at the bottom.

      // So we don't strictly need to memoize this for `TaskRow` performance, only for `SharedColorPopover`.
      // But `TaskRow` uses `onOpenColor` which IS memoized above.
      // So the list items won't re-render when we open a popover (unless activeColorPopover state causes parent re-render).
      // Parent re-renders -> List re-renders.
      // We can't avoid Parent re-render if we store local state here.
      // Unless we move the State down or context.
      // But if `TaskRow` is `React.memo`, it will ignore the parent re-render if its props are equal.
      // `onOpenColor` is stable. `fields` might be new object reference? `useFieldArray` fields is stable if no changes?
      // Actually `fields` array ref changes on every render of useFieldArray usually? No, only on changes.

      setActiveColorPopover((prev) => {
        if (!prev) return null;
        const { tempId } = prev;
        // We need to find the index dynamically because it might have changed if we allowed sorting while open (unlikely/blocked).
        // But we can't 'update' without index.
        // We need access to current value of `name`.
        const currentFields = getValues(name) as TaskItem[];
        const index = currentFields.findIndex((t) => t.tempId === tempId);
        if (index !== -1) {
          update(index, { ...currentFields[index], ...updates });
        }
        return prev; // keep open or close? usually close? The original code didn't close.
      });
    },
    [getValues, name, update],
  );

  // Original handler was:
  /*
  const handleColorUpdate = (updates: Partial<TaskItem>) => {
    if (activeColorTaskIdx === -1) return;
    const currentTask = getValues(`${name}.${activeColorTaskIdx}`);
    update(activeColorTaskIdx, { ...currentTask, ...updates });
  };
  */
  // I'll stick closer to the original logic but make it safe for `useCallback` by not depending on computed `activeColorTaskIdx`.

  const handleDependencyUpdate = useCallback(
    (updates: Partial<TaskItem>) => {
      setActiveDepPopover((prev) => {
        if (!prev) return null;
        const { tempId } = prev;
        const currentTasks = [...getValues(name)];
        const index = currentTasks.findIndex((t: any) => t.tempId === tempId);

        if (index === -1) return prev;

        // Update local task
        currentTasks[index] = {
          ...currentTasks[index],
          ...updates,
        };

        // Recalc logic ...
        // We need `recalculateDependentTasks` to be stable or in deps.
        // It comes from hook.

        if (
          updates.dependsOnTempId !== undefined ||
          updates.dependencyType !== undefined ||
          updates.dependencyDelay !== undefined
        ) {
          if (currentTasks[index].dependsOnTempId) {
            const updatedTasks = recalculateDependentTasks(
              currentTasks[index].dependsOnTempId!,
              currentTasks,
            );
            replace(updatedTasks);
          } else {
            const parentId = currentTasks[index].dependsOnTempId;
            if (parentId) {
              const updated = recalculateDependentTasks(parentId, currentTasks);
              replace(updated);
            } else {
              replace(currentTasks);
            }
          }
        } else {
          replace(currentTasks);
        }
        return prev;
      });
    },
    [getValues, name, recalculateDependentTasks, replace],
  );

  // Wait, `setActiveDepPopover` updater pattern is slightly abusive here for side effects.
  // But `activeDepTaskIdx` was computed in render.
  // Let's just lookup index inside the callback.

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        // We need current fields to find index?
        // `fields` from `useFieldArray` works but we want to be careful about closure freshness if we don't add it to deps.
        // But `fields` changes often.
        // We can use `getValues(name)` or the `fields` from the scope.
        // To keep `handleDragEnd` stable, we can't depend on `fields`.
        // We should use functional state updates or lookups?
        // `move` is stable.
        // We need to find indices.
        const currentItems = getValues(name);
        const oldIndex = currentItems.findIndex(
          (i: any) => i.tempId === active.id,
        );
        const newIndex = currentItems.findIndex(
          (i: any) => i.tempId === over.id,
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          move(oldIndex, newIndex);
        }
      }
    },
    [getValues, move, name],
  ); // Stable

  const handleAddEmptyTask = useCallback(() => {
    if (onAddEmptyTask) {
      onAddEmptyTask();
    } else {
      const currentVals = getValues(name) || [];
      const usedTaskIds = new Set(
        currentVals
          .map((t: any) => t.taskId)
          .filter((id: any) => id !== undefined),
      );
      const firstUnusedMaster = masterTasks.find(
        (mt) => !usedTaskIds.has(mt.id),
      );
      const defaultMaster = firstUnusedMaster || masterTasks[0];

      append({
        tempId: crypto.randomUUID(),
        taskId: defaultMaster?.id,
        name: defaultMaster?.name || "",
        duration: defaultMaster?.duration || 0,
        dayOffset: 0,
        startTime: "09:00",
        type: defaultMaster?.type || "PROCESS",
        color: defaultMaster?.color || "primary",
        isCashConfirmed: defaultMaster?.isCashConfirmed || false,
        requiresWorkingHours: defaultMaster?.requiresWorkingHours || false,
        dependsOnTempId: undefined,
        saveToMaster: false,
      });
    }
  }, [onAddEmptyTask, getValues, name, masterTasks, append]);

  if (readOnly && fields.length === 0) {
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
              items={fields.map((f: any) => f.tempId)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field: any, index) => (
                <TaskRow
                  key={field.tempId || field.id}
                  id={field.tempId}
                  index={index}
                  controlName={name}
                  masterTasks={masterTasks}
                  readOnly={readOnly}
                  update={update}
                  remove={remove}
                  replace={replace}
                  // getValues={getValues} // Removed expensive getValues pass-through usage
                  // Instead pass the map
                  taskNameMap={taskNameMap}
                  updateTaskOnMove={updateTaskOnMove}
                  recalculateDependentTasks={recalculateDependentTasks}
                  onOpenColor={handleOpenColor}
                  onOpenDependency={handleOpenDependency}
                />
              ))}
            </SortableContext>
          </DndContext>
          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks added. Click "Add Task" to start.
            </div>
          )}
        </div>
      </div>
      <SharedColorPopover
        isOpen={!!activeColorPopover}
        onClose={handleClosePopovers}
        anchorEl={activeColorPopover?.anchor ?? null}
        task={activeColorTask}
        onUpdate={handleColorUpdate}
      />

      <SharedDependencyPopover
        isOpen={!!activeDepPopover}
        onClose={handleClosePopovers}
        anchorEl={activeDepPopover?.anchor ?? null}
        task={activeDepTask}
        allTasks={getValues(name) as TaskItem[]} // Pass current form values
        onUpdate={handleDependencyUpdate}
      />
    </div>
  );
}
