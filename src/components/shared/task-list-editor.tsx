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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DollarSign,
  GripVertical,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorSelect } from "@/components/ui/color-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TaskItem,
  useTaskDependencies,
} from "@/hooks/use-task-dependencies";
import { TASK_COLORS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";

interface MasterTask {
  id: number;
  name: string;
  duration: number;
  type: "PROCESS" | "CUTOFF";
  color: string;
  isCashConfirmed: boolean;
}

interface TaskListEditorProps {
  name: string; // Field array name (e.g., "tasks")
  masterTasks: MasterTask[];
  onAddEmptyTask?: () => void;
  className?: string;
  readOnly?: boolean;
}

function SortableTaskItem({
  id,
  children,
}: {
  id: string;
  children: (args: { attributes: any; listeners: any }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : "auto",
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b last:border-0 bg-background",
        isDragging && "opacity-50 bg-muted/50 relative z-20",
      )}
    >
      {children({ attributes, listeners })}
    </div>
  );
}

export function TaskListEditor({
  name,
  masterTasks,
  onAddEmptyTask,
  className,
  readOnly = false,
}: TaskListEditorProps) {
  const { control, register, setValue, watch, getValues } = useFormContext();
  const { fields, append, remove, update, move } = useFieldArray({
    control,
    name,
  });

  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [openAttributesPopoverId, setOpenAttributesPopoverId] = useState<
    string | null
  >(null);

  const {
    getAbsoluteMinutes,
    updateDependentTasks,
    enforceDependencyConstraint,
  } = useTaskDependencies();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getDependencyLabel = (taskValues: any) => {
    if (!taskValues.dependsOnTempId) return "None";
    const parent = getValues(name).find(
      (t: any) => t.tempId === taskValues.dependsOnTempId,
    );
    if (!parent) return "Unknown";

    let label = parent.name || "Task";
    if (taskValues.dependencyType === "TIME_LAG") {
      label += ` (+${taskValues.dependencyDelay}m)`;
    } else if (taskValues.dependencyType === "NO_RELATION") {
      label += ` (No Rel)`;
    }
    return label;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    }
  };

  const getDependencyOptions = (currentTempId: string) => {
    const currentFields = getValues(name) as TaskItem[];
    return currentFields
      .map((f, index) => ({
        label: f.name || `Task ${index + 1}`,
        value: f.tempId,
        index,
      }))
      .filter((f) => f.value !== currentTempId);
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
        dependsOnTempId: undefined,
        saveToMaster: false,
      });
    }
  };

  // Helper to get color value for display
  const getColorValue = (colorName: string | undefined): string => {
    const found = TASK_COLORS.find((c) => c.value === (colorName || "primary"));
    return found ? found.color : "#3b82f6"; // Default blue fallback
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
        <div className="grid grid-cols-[30px_1fr_100px_280px_1fr_80px_40px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
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
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f: any) => f.tempId)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => {
                const currentTask = watch(`${name}.${index}`) as TaskItem & {
                  taskId?: number;
                  type?: string;
                  saveToMaster?: boolean;
                  color?: string;
                  isCashConfirmed?: boolean;
                };
                const taskValues = currentTask || field;

                return (
                  <SortableTaskItem
                    key={taskValues.tempId}
                    id={taskValues.tempId}
                  >
                    {({ attributes, listeners }) => (
                      <div className="grid grid-cols-[30px_1fr_100px_280px_1fr_80px_40px] gap-2 items-center px-3 py-2">
                        <div
                          {...attributes}
                          {...listeners}
                          className={cn(
                            "flex justify-center flex-shrink-0 p-1 rounded",
                            readOnly
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-grab hover:bg-muted active:cursor-grabbing text-muted-foreground",
                          )}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Task Name */}
                        <div className="space-y-1">
                          <Select
                            disabled={readOnly}
                            value={
                              taskValues.taskId
                                ? taskValues.taskId.toString()
                                : "custom"
                            }
                            onValueChange={(val) => {
                              if (val === "custom") {
                                update(index, {
                                  ...getValues(`${name}.${index}`),
                                  taskId: undefined,
                                  name: "",
                                  saveToMaster: false,
                                  type: "PROCESS",
                                  duration: 0,
                                  color: "primary",
                                  isCashConfirmed: false,
                                });
                              } else {
                                const mt = masterTasks.find(
                                  (t) => t.id === Number(val),
                                );
                                update(index, {
                                  ...getValues(`${name}.${index}`),
                                  taskId: Number(val),
                                  name: mt?.name || "",
                                  duration: mt?.duration || 0,
                                  type: mt?.type || "PROCESS",
                                  color: mt?.color || "primary",
                                  isCashConfirmed: mt?.isCashConfirmed || false,
                                  saveToMaster: false,
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent px-2">
                              <SelectValue placeholder="Select Task Source" />
                            </SelectTrigger>
                            <SelectContent>
                              {masterTasks.map((t) => (
                                <SelectItem key={t.id} value={t.id.toString()}>
                                  {t.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">
                                -- New Task --
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {!taskValues.taskId ? (
                            <div className="flex flex-col gap-1 w-full">
                              <Input
                                disabled={readOnly}
                                placeholder="Task Name"
                                className="h-9 text-xs"
                                {...register(`${name}.${index}.name`)}
                              />
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  disabled={readOnly}
                                  id={`saveToMaster-${field.id}`}
                                  className="h-3.5 w-3.5"
                                  checked={!!taskValues.saveToMaster}
                                  onCheckedChange={(checked) => {
                                    setValue(
                                      `${name}.${index}.saveToMaster`,
                                      !!checked,
                                    );
                                  }}
                                />
                                <Label
                                  htmlFor={`saveToMaster-${field.id}`}
                                  className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer"
                                >
                                  Save to Master
                                </Label>
                              </div>
                            </div>
                          ) : (
                            <input
                              type="hidden"
                              {...register(`${name}.${index}.name`)}
                            />
                          )}
                        </div>

                        {/* Type */}
                        <div>
                          <Select
                            disabled={readOnly || !!taskValues.taskId}
                            value={taskValues.type || "PROCESS"}
                            onValueChange={(val) => {
                              const newType = val as "PROCESS" | "CUTOFF";
                              const newDuration =
                                newType === "CUTOFF" ? 0 : taskValues.duration;
                              const currentTasks = getValues(name);

                              const updatedTask = {
                                ...currentTasks[index],
                                type: newType,
                                duration: newDuration,
                              };

                              update(index, updatedTask);
                              currentTasks[index] = updatedTask;

                              if (newDuration !== taskValues.duration) {
                                const childrenIndices = currentTasks
                                  .map((t: TaskItem, i: number) =>
                                    t.dependsOnTempId ===
                                    currentTasks[index].tempId
                                      ? i
                                      : -1,
                                  )
                                  .filter((i: number) => i !== -1);

                                childrenIndices.forEach((childIdx: number) =>
                                  enforceDependencyConstraint(
                                    childIdx,
                                    currentTasks[index].tempId,
                                    currentTasks,
                                    update,
                                  ),
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PROCESS">Process</SelectItem>
                              <SelectItem value="CUTOFF">Cutoff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Timing */}
                        <div className="grid grid-cols-[60px_1fr_1fr] gap-1">
                          <Select
                            disabled={readOnly}
                            value={taskValues.dayOffset.toString()}
                            onValueChange={(val) => {
                              const newOffset = Number(val);
                              const currentTasks = getValues(name);
                              const oldTask = currentTasks[index];
                              const oldStart = getAbsoluteMinutes(
                                oldTask.dayOffset,
                                oldTask.startTime || "00:00",
                              );
                              const newStart = getAbsoluteMinutes(
                                newOffset,
                                oldTask.startTime || "00:00",
                              );
                              const delta = newStart - oldStart;

                              const updatedTask = {
                                ...oldTask,
                                dayOffset: newOffset,
                              };
                              update(index, updatedTask);
                              currentTasks[index] = updatedTask;

                              if (delta !== 0)
                                updateDependentTasks(
                                  oldTask.tempId,
                                  delta,
                                  currentTasks,
                                  update,
                                );
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-2">D-2</SelectItem>
                              <SelectItem value="-1">D-1</SelectItem>
                              <SelectItem value="0">D</SelectItem>
                              <SelectItem value="1">D+1</SelectItem>
                              <SelectItem value="2">D+2</SelectItem>
                              <SelectItem value="3">D+3</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            disabled={readOnly}
                            type="time"
                            className="h-9 text-xs px-1"
                            {...register(`${name}.${index}.startTime`, {
                              onChange: (e) => {
                                const newValue = e.target.value;
                                const currentTasks = getValues(name);
                                const oldTask = currentTasks[index];
                                const oldStart = getAbsoluteMinutes(
                                  oldTask.dayOffset,
                                  oldTask.startTime || "00:00",
                                );
                                const newStart = getAbsoluteMinutes(
                                  oldTask.dayOffset,
                                  newValue,
                                );
                                const delta = newStart - oldStart;

                                currentTasks[index].startTime = newValue;

                                if (delta !== 0) {
                                  updateDependentTasks(
                                    oldTask.tempId,
                                    delta,
                                    currentTasks,
                                    update,
                                  );
                                }
                              },
                            })}
                          />

                          <Input
                            type="number"
                            disabled={readOnly || taskValues.type === "CUTOFF"}
                            className="h-9 text-xs px-1"
                            {...register(`${name}.${index}.duration`, {
                              valueAsNumber: true,
                              onChange: (e) => {
                                const newDuration = Number(e.target.value);
                                const currentTasks = getValues(name);
                                currentTasks[index].duration = newDuration;

                                const childrenIndices = currentTasks
                                  .map((t: TaskItem, i: number) =>
                                    t.dependsOnTempId ===
                                    currentTasks[index].tempId
                                      ? i
                                      : -1,
                                  )
                                  .filter((i: number) => i !== -1);

                                childrenIndices.forEach((childIdx: number) =>
                                  enforceDependencyConstraint(
                                    childIdx,
                                    currentTasks[index].tempId,
                                    currentTasks,
                                    update,
                                  ),
                                );
                              },
                            })}
                          />
                        </div>

                        {/* Dependency */}
                        <div>
                          <Popover
                            open={openPopoverId === taskValues.tempId}
                            onOpenChange={(open) =>
                              setOpenPopoverId(open ? taskValues.tempId : null)
                            }
                            modal={false}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={readOnly}
                                className={cn(
                                  "w-full h-7 text-xs justify-between px-2 font-normal",
                                  !taskValues.dependsOnTempId &&
                                    "text-muted-foreground",
                                )}
                              >
                                <span className="truncate">
                                  {getDependencyLabel(taskValues)}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[300px] p-3"
                              align="start"
                              onPointerDownOutside={(e) => {
                                // Prevent closing when clicking into a Select content (portal)
                                if (
                                  e.target instanceof Element &&
                                  (e.target.closest('[role="listbox"]') ||
                                    e.target.closest('[role="option"]'))
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Parent Task</Label>
                                  <Select
                                    value={taskValues.dependsOnTempId || "none"}
                                    onValueChange={(val) => {
                                      const newVal =
                                        val === "none" ? undefined : val;
                                      const currentTasks = getValues(name);

                                      const updatedTask = {
                                        ...currentTasks[index],
                                        dependsOnTempId: newVal,
                                        // Reset type/delay if removing dependency
                                        ...(newVal
                                          ? {}
                                          : {
                                              dependencyType: "IMMEDIATE",
                                              dependencyDelay: 0,
                                            }),
                                      };
                                      update(index, updatedTask);
                                      currentTasks[index] = updatedTask;

                                      if (newVal)
                                        enforceDependencyConstraint(
                                          index,
                                          newVal,
                                          currentTasks,
                                          update,
                                        );
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {getDependencyOptions(
                                        taskValues.tempId,
                                      ).map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div
                                  className={cn(
                                    "space-y-1",
                                    !taskValues.dependsOnTempId && "opacity-50",
                                  )}
                                >
                                  <Label className="text-xs">
                                    Relation Type
                                  </Label>
                                  <Select
                                    disabled={!taskValues.dependsOnTempId}
                                    value={
                                      taskValues.dependencyType || "IMMEDIATE"
                                    }
                                    onValueChange={(val) => {
                                      const currentTasks = getValues(name);
                                      const updatedTask = {
                                        ...currentTasks[index],
                                        dependencyType: val,
                                      };
                                      update(index, updatedTask);
                                      currentTasks[index] = updatedTask;

                                      if (taskValues.dependsOnTempId) {
                                        enforceDependencyConstraint(
                                          index,
                                          taskValues.dependsOnTempId,
                                          currentTasks,
                                          update,
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="IMMEDIATE">
                                        Immediately After
                                      </SelectItem>
                                      <SelectItem value="TIME_LAG">
                                        After Gap (Lag)
                                      </SelectItem>
                                      <SelectItem value="NO_RELATION">
                                        No Time Relation
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(taskValues.dependencyType === "TIME_LAG" ||
                                  !taskValues.dependencyType) && (
                                  <div
                                    className={cn(
                                      "space-y-1",
                                      !taskValues.dependsOnTempId &&
                                        "opacity-50",
                                    )}
                                  >
                                    <Label className="text-xs">
                                      Lag (minutes)
                                    </Label>
                                    <Input
                                      type="number"
                                      disabled={!taskValues.dependsOnTempId}
                                      className="h-8 text-xs"
                                      value={taskValues.dependencyDelay || 0}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const currentTasks = getValues(name);
                                        const updatedTask = {
                                          ...currentTasks[index],
                                          dependencyDelay: val,
                                        };
                                        update(index, updatedTask);
                                        currentTasks[index] = updatedTask;

                                        if (taskValues.dependsOnTempId) {
                                          enforceDependencyConstraint(
                                            index,
                                            taskValues.dependsOnTempId,
                                            currentTasks,
                                            update,
                                          );
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 pt-2 flex justify-end">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setOpenPopoverId(null)}
                                >
                                  Done
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Attributes (Color/Cash/Settings) */}
                        <div className="flex items-center justify-end gap-1">
                          {/* Visual Indicators */}
                          <div
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{
                              background: getColorValue(taskValues.color),
                            }}
                            title={`Color: ${taskValues.color || "primary"}`}
                          />
                          {taskValues.isCashConfirmed && (
                            <div title="Cash Confirmed">
                              <DollarSign className="h-3 w-3 text-green-600" />
                            </div>
                          )}

                          <Popover
                            open={openAttributesPopoverId === taskValues.tempId}
                            onOpenChange={(open) =>
                              setOpenAttributesPopoverId(
                                open ? taskValues.tempId : null,
                              )
                            }
                            modal={false}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground ml-1"
                                title="Edit Attributes"
                                disabled={readOnly}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[280px] p-4"
                              align="end"
                              onPointerDownOutside={(e) => {
                                // Prevent closing when interacting with select dropdowns inside
                                if (
                                  e.target instanceof Element &&
                                  (e.target.closest('[role="listbox"]') ||
                                    e.target.closest('[role="option"]'))
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs">Color</Label>
                                  <ColorSelect
                                    value={taskValues.color}
                                    onValueChange={(val) => {
                                      const currentTasks = getValues(name);
                                      const updatedTask = {
                                        ...currentTasks[index],
                                        color: val,
                                      };
                                      update(index, updatedTask);
                                      currentTasks[index] = updatedTask;
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`isCashConfirmed-${taskValues.tempId}`}
                                    className="h-4 w-4"
                                    checked={taskValues.isCashConfirmed}
                                    onCheckedChange={(checked) => {
                                      const currentTasks = getValues(name);
                                      const updatedTask = {
                                        ...currentTasks[index],
                                        isCashConfirmed: !!checked,
                                      };
                                      update(index, updatedTask);
                                      currentTasks[index] = updatedTask;
                                    }}
                                    disabled={!!taskValues.taskId}
                                  />
                                  <Label
                                    htmlFor={`isCashConfirmed-${taskValues.tempId}`}
                                    className="cursor-pointer text-xs"
                                  >
                                    Is Cash Confirmed?
                                  </Label>
                                </div>
                                <div className="pt-2 flex justify-end">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      setOpenAttributesPopoverId(null)
                                    }
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Actions */}
                        <div className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => remove(index)}
                            disabled={readOnly}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SortableTaskItem>
                );
              })}
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
