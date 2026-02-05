import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, DollarSign, GripVertical, Trash2 } from "lucide-react";
import { memo, useRef } from "react";
import {
  type UseFieldArrayRemove,
  type UseFieldArrayUpdate,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  onOpenDependency: (tempId: string, anchor: HTMLElement) => void;
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

// Isolated component to render dependency label without re-rendering the whole row
// when other tasks change.
function DependencyLabel({
  controlName,
  dependsOnTempId,
  dependencyType,
  dependencyDelay,
}: {
  controlName: string;
  dependsOnTempId?: string | null;
  dependencyType?: string;
  dependencyDelay?: number;
}) {
  // We need to 'watch' the list to ensure we update when parent name changes?
  // If we just use getValues(), it won't auto-update when parent name changes.
  // But if we use watch(), we trigger re-renders.
  // The goal is to ONLY re-render this label, not the whole Row inputs.

  // Actually, we can use useWatch for the specific parent index if we knew it.
  // But we don't know the index easily without searching.
  // Searching requires the list.

  // Let's watch the whole list HERE in this tiny component.
  // Rerendering this tiny span is cheap.
  // Rerendering the whole TaskRow (with 10 inputs) is expensive.
  const allTasks = useWatch({ name: controlName }) as TaskItem[];

  if (!dependsOnTempId) return <>None</>;

  const parent = allTasks?.find((t) => t.tempId === dependsOnTempId);
  if (!parent) return <>Unknown</>;

  let label = parent.name || "Task";
  if (dependencyType === "TIME_LAG") {
    label += ` (+${dependencyDelay}m)`;
  } else if (dependencyType === "NO_RELATION") {
    label += ` (No Rel)`;
  }

  return <span className="truncate">{label}</span>;
}

export const TaskRow = memo(function TaskRow({
  id,
  index,
  controlName,
  masterTasks,
  readOnly,
  update,
  remove,
  replace,
  updateTaskOnMove,
  recalculateDependentTasks,
  onOpenDependency,
}: TaskRowProps) {
  const { register, setValue, watch, getValues } = useFormContext();
  const taskValues = watch(`${controlName}.${index}`) as TaskItem;
  const focusValueRef = useRef<string>("");

  // Only run this when dependencies change
  const getColorValue = (colorName: string | undefined): string => {
    const found = TASK_COLORS.find((c) => c.value === (colorName || "primary"));
    return found ? found.color : "#3b82f6";
  };

  if (!taskValues) return null;

  return (
    <SortableTaskItem id={id}>
      {({ attributes, listeners }) => {
        const colorValue = getColorValue(taskValues.color);
        const style = {
          backgroundColor: `color-mix(in srgb, ${colorValue}, transparent 95%)`,
          borderColor: `color-mix(in srgb, ${colorValue}, transparent 50%)`,
          borderLeftWidth: "4px",
          borderLeftColor: colorValue,
        };

        return (
          <div
            className="grid grid-cols-[30px_1fr_100px_280px_0.9fr_90px_30px] gap-2 items-center px-3 py-2 border-b last:border-0"
            style={style}
          >
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className={cn(
                "flex justify-center flex-shrink-0 p-1 rounded",
                readOnly
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-grab hover:bg-black/5 active:cursor-grabbing text-muted-foreground",
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
              <Button
                variant="outline"
                type="button"
                role="combobox"
                disabled={readOnly}
                className={cn(
                  "w-full h-9 text-xs justify-between px-2 font-normal",
                  !taskValues.dependsOnTempId && "text-muted-foreground",
                )}
                onClick={(e) =>
                  onOpenDependency(taskValues.tempId, e.currentTarget)
                }
              >
                <span className="truncate">
                  <DependencyLabel
                    controlName={controlName}
                    dependsOnTempId={taskValues.dependsOnTempId}
                    dependencyType={taskValues.dependencyType}
                    dependencyDelay={taskValues.dependencyDelay}
                  />
                </span>
              </Button>
            </div>

            {/* Indicators (Read Only) */}
            <div className="flex items-center justify-end gap-1.5 min-w-[50px]">
              {taskValues.isCashConfirmed && (
                <div
                  title="Cash Confirmed"
                  className="bg-green-100 rounded-full p-1 flex-shrink-0"
                >
                  <DollarSign className="w-3.5 h-3.5 text-green-700" />
                </div>
              )}
              {taskValues.requiresWorkingHours && (
                <div
                  title="Requires Working Hours"
                  className="bg-blue-100 rounded-full p-1 flex-shrink-0"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-700" />
                </div>
              )}
            </div>

            {/* Remove */}
            <div className="flex justify-end">
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
        );
      }}
    </SortableTaskItem>
  );
});
