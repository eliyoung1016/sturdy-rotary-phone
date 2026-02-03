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
import { useId } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { TaskRow } from "@/components/simulation/task-row";
import { Button } from "@/components/ui/button";
import { useTaskDependencies } from "@/hooks/use-task-dependencies";
import { cn } from "@/lib/utils";
import type { MasterTask } from "@/types/simulation";

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
  const { control, getValues } = useFormContext();
  const { fields, append, remove, update, move, replace } = useFieldArray({
    control,
    name,
  });

  const { updateTaskOnMove, recalculateDependentTasks } =
    useTaskDependencies(workingHours);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dndContextId = useId();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(
        (field: any) => field.tempId === active.id,
      );
      const newIndex = fields.findIndex(
        (field: any) => field.tempId === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    }
  };

  const handleAddEmptyTask = () => {
    if (onAddEmptyTask) {
      onAddEmptyTask();
    } else {
      // Default fallback implementation
      const usedTaskIds = new Set(
        (getValues(name) || [])
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
  };

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
                  getValues={getValues}
                  updateTaskOnMove={updateTaskOnMove}
                  recalculateDependentTasks={recalculateDependentTasks}
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
    </div>
  );
}
