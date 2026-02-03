import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  DollarSign,
  GripVertical,
  Settings2,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  type UseFieldArrayRemove,
  type UseFieldArrayUpdate,
  useFormContext,
} from "react-hook-form";

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
import { TASK_COLORS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";
import type { MasterTask, TaskItem } from "@/types/simulation";

interface TaskRowProps {
  id: string;
  index: number;
  controlName: string;
  masterTasks: MasterTask[];
  readOnly: boolean;
  update: UseFieldArrayUpdate<any, any>;
  remove: UseFieldArrayRemove;
  replace: (items: TaskItem[]) => void;
  getValues: (payload?: string | string[]) => any;
  updateTaskOnMove: (
    index: number,
    dayOffset: number,
    startTime: string,
    currentTasks: TaskItem[],
  ) => TaskItem[];
  recalculateDependentTasks: (
    tempId: string,
    currentTasks: TaskItem[],
  ) => TaskItem[];
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

export function TaskRow({
  id,
  index,
  controlName,
  masterTasks,
  readOnly,
  update,
  remove,
  replace,
  getValues,
  updateTaskOnMove,
  recalculateDependentTasks,
}: TaskRowProps) {
  const { register, setValue, watch } = useFormContext();
  const taskValues = watch(`${controlName}.${index}`) as TaskItem;
  const [openPopoverId, setOpenPopoverId] = useState<boolean>(false);
  const [openAttributesPopoverId, setOpenAttributesPopoverId] =
    useState<boolean>(false);
  const focusValueRef = useRef<string>("");

  const getColorValue = (colorName: string | undefined): string => {
    const found = TASK_COLORS.find((c) => c.value === (colorName || "primary"));
    return found ? found.color : "#3b82f6";
  };

  const getDependencyLabel = (task: TaskItem) => {
    if (!task.dependsOnTempId) return "None";
    const allTasks = getValues(controlName) as TaskItem[];
    const parent = allTasks.find((t) => t.tempId === task.dependsOnTempId);
    if (!parent) return "Unknown";

    let label = parent.name || "Task";
    if (task.dependencyType === "TIME_LAG") {
      label += ` (+${task.dependencyDelay}m)`;
    } else if (task.dependencyType === "NO_RELATION") {
      label += ` (No Rel)`;
    }
    return label;
  };

  const getDependencyOptions = (currentTempId: string) => {
    const currentFields = getValues(controlName) as TaskItem[];
    return currentFields
      .map((f, idx) => ({
        label: f.name || `Task ${idx + 1}`,
        value: f.tempId,
        index: idx,
      }))
      .filter((f) => f.value !== currentTempId);
  };

  if (!taskValues) return null;

  return (
    <SortableTaskItem id={id}>
      {({ attributes, listeners }) => (
        <div className="grid grid-cols-[30px_1fr_100px_280px_0.9fr_90px_30px] gap-2 items-center px-3 py-2">
          {/* Drag Handle */}
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

          {/* Task Source / Name */}
          <div className="space-y-1">
            <Select
              disabled={readOnly}
              value={
                taskValues.taskId ? taskValues.taskId.toString() : "custom"
              }
              onValueChange={(val) => {
                const currentVal = getValues(`${controlName}.${index}`);
                if (val === "custom") {
                  update(index, {
                    ...currentVal,
                    taskId: undefined,
                    name: "",
                    saveToMaster: false,
                    type: "PROCESS",
                    duration: 0,
                    color: "primary",
                    isCashConfirmed: false,
                    requiresWorkingHours: false,
                  });
                } else {
                  const mt = masterTasks.find((t) => t.id === Number(val));
                  update(index, {
                    ...currentVal,
                    taskId: Number(val),
                    name: mt?.name || "",
                    duration: mt?.duration || 0,
                    type: mt?.type || "PROCESS",
                    color: mt?.color || "primary",
                    isCashConfirmed: mt?.isCashConfirmed || false,
                    requiresWorkingHours: mt?.requiresWorkingHours || false,
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
                <SelectItem value="custom">-- New Task --</SelectItem>
              </SelectContent>
            </Select>

            {!taskValues.taskId ? (
              <div className="flex flex-col gap-1 w-full">
                <Input
                  disabled={readOnly}
                  placeholder="Task Name"
                  className="h-9 text-xs"
                  {...register(`${controlName}.${index}.name`)}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    disabled={readOnly}
                    id={`saveToMaster-${id}`}
                    className="h-3.5 w-3.5"
                    checked={!!taskValues.saveToMaster}
                    onCheckedChange={(checked) => {
                      setValue(
                        `${controlName}.${index}.saveToMaster`,
                        !!checked,
                      );
                    }}
                  />
                  <Label
                    htmlFor={`saveToMaster-${id}`}
                    className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer"
                  >
                    Save to Master
                  </Label>
                </div>
              </div>
            ) : (
              <input
                type="hidden"
                {...register(`${controlName}.${index}.name`)}
              />
            )}
          </div>

          {/* Type Select */}
          <div>
            <Select
              disabled={readOnly || !!taskValues.taskId}
              value={taskValues.type || "PROCESS"}
              onValueChange={(val) => {
                const newType = val as "PROCESS" | "CUTOFF";
                const newDuration =
                  newType === "CUTOFF" ? 0 : taskValues.duration;
                const currentTasks = [...getValues(controlName)];

                currentTasks[index] = {
                  ...currentTasks[index],
                  type: newType,
                  duration: newDuration,
                };

                if (newDuration !== taskValues.duration) {
                  const updatedTasks = recalculateDependentTasks(
                    currentTasks[index].tempId,
                    currentTasks,
                  );
                  setValue(controlName, updatedTasks);
                } else {
                  setValue(controlName, currentTasks);
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

          {/* Day / Time / Duration */}
          <div className="grid grid-cols-[60px_1fr_1fr] gap-1">
            <Select
              disabled={readOnly}
              value={taskValues.dayOffset.toString()}
              onValueChange={(val) => {
                const newOffset = Number(val);
                const currentTasks = [...getValues(controlName)];
                const updatedTasks = updateTaskOnMove(
                  index,
                  newOffset,
                  taskValues.startTime || "09:00",
                  currentTasks,
                );
                setValue(controlName, updatedTasks);
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
              value={taskValues.startTime || ""}
              onFocus={(e) => {
                focusValueRef.current = e.target.value;
              }}
              {...register(`${controlName}.${index}.startTime`)}
              onBlur={(e) => {
                const newValue = e.target.value;
                if (newValue === focusValueRef.current) return;

                const currentTasks = getValues(controlName).map((t: any) => ({
                  ...t,
                }));

                const updatedTasks = updateTaskOnMove(
                  index,
                  taskValues.dayOffset,
                  newValue,
                  currentTasks,
                );
                replace(updatedTasks);
                focusValueRef.current = newValue;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />

            <Input
              type="number"
              disabled={readOnly || taskValues.type === "CUTOFF"}
              className="h-9 text-xs px-1"
              value={taskValues.duration ?? 0}
              onFocus={(e) => {
                focusValueRef.current = e.target.value;
              }}
              {...register(`${controlName}.${index}.duration`, {
                valueAsNumber: true,
              })}
              onBlur={(e) => {
                const newDuration = Number(e.target.value);
                if (Number(focusValueRef.current) === newDuration) return;

                const currentTasks = getValues(controlName).map((t: any) => ({
                  ...t,
                }));

                currentTasks[index].duration = newDuration;

                const updatedTasks = recalculateDependentTasks(
                  currentTasks[index].tempId,
                  currentTasks,
                );
                replace(updatedTasks);
                focusValueRef.current = newDuration.toString();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />
          </div>

          {/* Dependency */}
          <div>
            <Popover
              open={openPopoverId}
              onOpenChange={setOpenPopoverId}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={readOnly}
                  className={cn(
                    "w-full h-9 text-xs justify-between px-2 font-normal",
                    !taskValues.dependsOnTempId && "text-muted-foreground",
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
                        const newVal = val === "none" ? undefined : val;
                        const currentTasks = [...getValues(controlName)];

                        currentTasks[index] = {
                          ...currentTasks[index],
                          dependsOnTempId: newVal,
                          ...(newVal
                            ? {}
                            : {
                                dependencyType: "IMMEDIATE",
                                dependencyDelay: 0,
                              }),
                        };

                        if (newVal) {
                          const updatedTasks = recalculateDependentTasks(
                            newVal,
                            currentTasks,
                          );
                          setValue(controlName, updatedTasks);
                        } else {
                          setValue(controlName, currentTasks);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getDependencyOptions(taskValues.tempId).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
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
                    <Label className="text-xs">Relation Type</Label>
                    <Select
                      disabled={!taskValues.dependsOnTempId}
                      value={taskValues.dependencyType || "IMMEDIATE"}
                      onValueChange={(val) => {
                        const currentTasks = [...getValues(controlName)];
                        currentTasks[index] = {
                          ...currentTasks[index],
                          dependencyType: val as any,
                        };

                        if (taskValues.dependsOnTempId) {
                          const updatedTasks = recalculateDependentTasks(
                            taskValues.dependsOnTempId,
                            currentTasks,
                          );
                          setValue(controlName, updatedTasks);
                        } else {
                          setValue(controlName, currentTasks);
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
                        !taskValues.dependsOnTempId && "opacity-50",
                      )}
                    >
                      <Label className="text-xs">Lag (minutes)</Label>
                      <Input
                        type="number"
                        disabled={!taskValues.dependsOnTempId}
                        className="h-8 text-xs"
                        value={taskValues.dependencyDelay ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const currentTasks = [...getValues(controlName)];
                          currentTasks[index] = {
                            ...currentTasks[index],
                            dependencyDelay: val,
                          };

                          if (taskValues.dependsOnTempId) {
                            const updatedTasks = recalculateDependentTasks(
                              taskValues.dependsOnTempId,
                              currentTasks,
                            );
                            setValue(controlName, updatedTasks);
                          } else {
                            setValue(controlName, currentTasks);
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
                    onClick={() => setOpenPopoverId(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Indicators + Attributes */}
          <div className="flex items-center justify-end gap-1">
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
            {taskValues.requiresWorkingHours && (
              <div title="Requires Working Hours">
                <Clock className="h-3 w-3 text-blue-600" />
              </div>
            )}

            <Popover
              open={openAttributesPopoverId}
              onOpenChange={setOpenAttributesPopoverId}
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
                        const currentTasks = getValues(controlName);
                        // We use index access for simplicity, ideally we use update
                        const updatedTask = {
                          ...currentTasks[index],
                          color: val,
                        };
                        update(index, updatedTask);
                        // Also update form value directly to ensure sync if mix-and-matching
                        currentTasks[index] = updatedTask;
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`isCashConfirmed-${id}`}
                      className="h-4 w-4"
                      checked={!!taskValues.isCashConfirmed}
                      onCheckedChange={(checked) => {
                        const currentTasks = getValues(controlName);
                        const updatedTask = {
                          ...currentTasks[index],
                          isCashConfirmed: !!checked,
                        };
                        update(index, updatedTask);
                        currentTasks[index] = updatedTask;
                      }}
                    />
                    <Label
                      htmlFor={`isCashConfirmed-${id}`}
                      className="cursor-pointer text-xs"
                    >
                      Is Cash Confirmed?
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`requiresWorkingHours-${id}`}
                      className="h-4 w-4"
                      checked={!!taskValues.requiresWorkingHours}
                      onCheckedChange={(checked) => {
                        const currentTasks = getValues(controlName);
                        const updatedTask = {
                          ...currentTasks[index],
                          requiresWorkingHours: !!checked,
                        };
                        update(index, updatedTask);
                        currentTasks[index] = updatedTask;
                      }}
                    />
                    <Label
                      htmlFor={`requiresWorkingHours-${id}`}
                      className="cursor-pointer text-xs"
                    >
                      Requires Working Hours
                    </Label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={() => setOpenAttributesPopoverId(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Remove */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={readOnly}
              onClick={() => remove(index)}
              title="Remove Task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </SortableTaskItem>
  );
}
