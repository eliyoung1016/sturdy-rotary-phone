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
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, SubmitHandler } from "react-hook-form";

import { getMasterTasks } from "@/app/actions/master-task";
import { createTemplate, updateTemplate } from "@/app/actions/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  type TemplateInput,
  type TemplateTaskInput,
  templateSchema,
} from "@/lib/schemas/template";

interface MasterTask {
  id: number;
  name: string;
  duration: number;
  type: "PROCESS" | "CUTOFF";
  color: string;
  isCashConfirmed: boolean;
}

interface TemplateFormProps {
  initialData?: TemplateInput;
  templateId?: number;
}

function SortableTaskItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
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
    zIndex: isDragging ? 20 : "auto", // Ensure dragged item is on top
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-2 hover:bg-muted rounded active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function TemplateForm({ initialData, templateId }: TemplateFormProps) {
  const router = useRouter();
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      tasks: initialData?.tasks || [],
    },
  });

  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  useEffect(() => {
    async function fetchMasterTasks() {
      const res = await getMasterTasks();
      if (res.success && res.data) {
        // Cast the string type from DB to our union type if valid
        // Assuming DB guarantees valid types or we should validate
        setMasterTasks(res.data as unknown as MasterTask[]);
      }
    }
    fetchMasterTasks();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ... existing imports ... */

  /* Added helpers */
  const getAbsoluteMinutes = (dayOffset: number, timeStr: string = "00:00") => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return dayOffset * 24 * 60 + hours * 60 + minutes;
  };

  const getDayAndTime = (totalMinutes: number) => {
    const dayOffset = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes - dayOffset * 24 * 60;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    return { dayOffset, timeStr };
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

  /* Dependency Logic */
  const updateDependentTasks = (
    changedTaskTempId: string,
    timeDelta: number,
    currentTasks: TemplateTaskInput[],
    visited = new Set<string>(),
  ) => {
    if (visited.has(changedTaskTempId)) return;
    visited.add(changedTaskTempId);

    // Find all tasks that depend on this task
    const dependentTasks = currentTasks.filter(
      (t) => t.dependsOnTempId === changedTaskTempId,
    );

    dependentTasks.forEach((depTask) => {
      const depIndex = currentTasks.findIndex(
        (t) => t.tempId === depTask.tempId,
      );
      if (depIndex === -1) return;

      // Calculate new start time for dependent
      const currentStart = getAbsoluteMinutes(
        depTask.dayOffset,
        depTask.startTime,
      );
      const newStartTotal = currentStart + timeDelta;
      const { dayOffset, timeStr } = getDayAndTime(newStartTotal);

      // Update the task in the local array
      currentTasks[depIndex] = {
        ...currentTasks[depIndex],
        dayOffset,
        startTime: timeStr,
      };

      // Apply update to form
      update(depIndex, currentTasks[depIndex]);

      // Recursively update downstream
      updateDependentTasks(depTask.tempId, timeDelta, currentTasks, visited);
    });
  };

  const enforceDependencyConstraint = (
    childIndex: number,
    parentId: string, // tempId of parent
    currentTasks: TemplateTaskInput[],
  ) => {
    const childTask = currentTasks[childIndex];
    const parentTask = currentTasks.find((t) => t.tempId === parentId);

    if (!parentTask) return;

    const parentStart = getAbsoluteMinutes(
      parentTask.dayOffset,
      parentTask.startTime,
    );
    const parentEnd = parentStart + (parentTask.duration || 0); // Duration in minutes

    const childStart = getAbsoluteMinutes(
      childTask.dayOffset,
      childTask.startTime,
    );

    if (childStart < parentEnd) {
      // Child starts before Parent ends. Snap Child to Parent End.
      const { dayOffset, timeStr } = getDayAndTime(parentEnd);

      const newChildTask = {
        ...childTask,
        dayOffset,
        startTime: timeStr,
      };

      currentTasks[childIndex] = newChildTask;
      update(childIndex, newChildTask);

      // Calculate delta for child to shift its own dependents
      const delta = parentEnd - childStart;
      updateDependentTasks(childTask.tempId, delta, currentTasks);
    }
  };

  const onSubmit = async (data: TemplateInput) => {
    setLoading(true);
    try {
      // Ensure sequenceOrder is correct based on current list order
      const orderedTasks = data.tasks.map((task, index) => ({
        ...task,
        sequenceOrder: index,
      }));

      let res;
      if (templateId) {
        res = await updateTemplate(templateId, {
          ...data,
          tasks: orderedTasks,
        });
      } else {
        res = await createTemplate({ ...data, tasks: orderedTasks });
      }

      console.log("Template Action Response:", res);
      if (!res.success) {
        console.error(res.errors || res.message);
        alert(
          `Failed to ${templateId ? "update" : "create"} template. Please check the form.`,
        );
      } else {
        console.log("Redirecting to /templates...");
        router.refresh();
        router.push("/templates");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const addEmptyTask = () => {
    // Find the first master task that isn't already used
    const usedTaskIds = new Set(
      fields.map((f) => f.taskId).filter((id) => id !== undefined),
    );
    const firstUnusedMaster = masterTasks.find((mt) => !usedTaskIds.has(mt.id));

    // Default to the first unused master task, or the first master task if all used, or undefined (custom) if no master tasks exist
    const defaultMaster = firstUnusedMaster || masterTasks[0];

    append({
      tempId: crypto.randomUUID(),
      taskId: defaultMaster?.id, // Default to master task ID or undefined
      name: defaultMaster?.name || "", // Default to master task name or empty
      duration: defaultMaster?.duration || 0,
      dayOffset: 0,
      startTime: "09:00",
      sequenceOrder: fields.length,
      type: defaultMaster?.type || "PROCESS",
      color: defaultMaster?.color || "primary",
      isCashConfirmed: defaultMaster?.isCashConfirmed || false,
      dependsOnTempId: undefined, // Singular
      saveToMaster: false,
    });
  };

  const getDependencyOptions = (currentTempId: string) => {
    return fields
      .filter((f) => f.tempId !== currentTempId)
      .map((f, index) => ({
        label: f.name || `Task ${index + 1}`,
        value: f.tempId,
      }));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              {...form.register("name")}
              placeholder="e.g. Current Fund Practice"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              {...form.register("description")}
              placeholder="Enter a brief overview..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Button type="button" onClick={addEmptyTask} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>

        {/* Drag and Drop Context */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, index) => {
              return (
                <SortableTaskItem key={field.id} id={field.id}>
                  <Card
                    className={`relative ${
                      field.type === "CUTOFF"
                        ? "border-destructive/50 bg-destructive/5"
                        : ""
                    }`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                      {/* Left Column: Task Definition */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Task Name</Label>
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                              <Select
                                value={
                                  field.taskId
                                    ? field.taskId.toString()
                                    : "custom"
                                }
                                onValueChange={(val) => {
                                  if (val === "custom") {
                                    update(index, {
                                      ...field,
                                      taskId: undefined,
                                      name: "",
                                      saveToMaster: false,
                                    });
                                  } else {
                                    const mt = masterTasks.find(
                                      (t) => t.id === Number(val),
                                    );
                                    update(index, {
                                      ...field,
                                      taskId: Number(val),
                                      name: mt?.name || "",
                                      duration: mt?.duration || 0,
                                      type: mt?.type || "PROCESS",
                                      color: mt?.color || "primary",
                                      isCashConfirmed:
                                        mt?.isCashConfirmed || false,
                                      saveToMaster: false,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Task Source" />
                                </SelectTrigger>
                                <SelectContent>
                                  {masterTasks.map((t) => (
                                    <SelectItem
                                      key={t.id}
                                      value={t.id.toString()}
                                    >
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">
                                    Custom Task
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              {!field.taskId && (
                                <Input
                                  placeholder="Enter Task Name"
                                  {...form.register(
                                    `tasks.${index}.name` as const,
                                  )}
                                />
                              )}
                              {field.taskId && (
                                <input
                                  type="hidden"
                                  {...form.register(
                                    `tasks.${index}.name` as const,
                                  )}
                                  value={field.name}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Task Type</Label>
                          <Select
                            value={field.type || "PROCESS"}
                            onValueChange={(val) => {
                              const newType = val as "PROCESS" | "CUTOFF";
                              const newDuration =
                                newType === "CUTOFF" ? 0 : field.duration;

                              // Update local and form
                              const currentTasks = form.getValues().tasks;
                              currentTasks[index] = {
                                ...currentTasks[index],
                                type: newType,
                                duration: newDuration,
                              };
                              update(index, currentTasks[index]);

                              // If duration changed (e.g. to 0), check children
                              if (newDuration !== field.duration) {
                                // Find children and enforce constraint
                                const childrenIndices = currentTasks
                                  .map((t, i) =>
                                    t.dependsOnTempId === field.tempId ? i : -1,
                                  )
                                  .filter((i) => i !== -1);

                                childrenIndices.forEach((childIdx) => {
                                  enforceDependencyConstraint(
                                    childIdx,
                                    field.tempId,
                                    currentTasks,
                                  );
                                });
                              }
                            }}
                            disabled={!!field.taskId}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PROCESS">Process</SelectItem>
                              <SelectItem value="CUTOFF">Cutoff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Select
                            value={field.color || "primary"}
                            onValueChange={(val) => {
                              const currentTasks = form.getValues().tasks;
                              currentTasks[index] = {
                                ...currentTasks[index],
                                color: val,
                              };
                              update(index, currentTasks[index]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">
                                Secondary
                              </SelectItem>
                              <SelectItem value="destructive">
                                Destructive
                              </SelectItem>
                              <SelectItem value="outline">Outline</SelectItem>
                              <SelectItem value="spot-tuquoise-1">
                                Turquoise 1
                              </SelectItem>
                              <SelectItem value="spot-tuquoise-2">
                                Turquoise 2
                              </SelectItem>
                              <SelectItem value="spot-tuquoise-3">
                                Turquoise 3
                              </SelectItem>
                              <SelectItem value="spot-blue-1">
                                Blue 1
                              </SelectItem>
                              <SelectItem value="spot-blue-2">
                                Blue 2
                              </SelectItem>
                              <SelectItem value="spot-blue-3">
                                Blue 3
                              </SelectItem>
                              <SelectItem value="spot-orange-1">
                                Orange 1
                              </SelectItem>
                              <SelectItem value="spot-orange-2">
                                Orange 2
                              </SelectItem>
                              <SelectItem value="spot-orange-3">
                                Orange 3
                              </SelectItem>
                              <SelectItem value="spot-yellow">
                                Yellow
                              </SelectItem>
                              <SelectItem value="spot-green-1">
                                Green 1
                              </SelectItem>
                              <SelectItem value="spot-green-2">
                                Green 2
                              </SelectItem>
                              <SelectItem value="spot-mauve-1">
                                Mauve 1
                              </SelectItem>
                              <SelectItem value="spot-mauve-2">
                                Mauve 2
                              </SelectItem>
                              <SelectItem value="spot-mauve-3">
                                Mauve 3
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {!field.taskId && (
                          <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                              id={`saveToMaster-${field.tempId}`}
                              checked={
                                !!form.watch(`tasks.${index}.saveToMaster`)
                              }
                              onCheckedChange={(checked: boolean) => {
                                form.setValue(
                                  `tasks.${index}.saveToMaster`,
                                  checked,
                                );
                              }}
                            />
                            <Label htmlFor={`saveToMaster-${field.tempId}`}>
                              Save to Master Tasks
                            </Label>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Timing & Dependencies */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Timing</Label>
                            <Select
                              defaultValue={field.dayOffset.toString()}
                              onValueChange={(val) => {
                                const newOffset = Number(val);
                                const currentTasks = form.getValues().tasks;
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

                                // Update this task
                                currentTasks[index] = {
                                  ...oldTask,
                                  dayOffset: newOffset,
                                };
                                update(index, currentTasks[index]);

                                // Cascade
                                if (delta !== 0) {
                                  updateDependentTasks(
                                    oldTask.tempId,
                                    delta,
                                    currentTasks,
                                  );
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="-2">Day D-2</SelectItem>
                                <SelectItem value="-1">Day D-1</SelectItem>
                                <SelectItem value="0">Day D</SelectItem>
                                <SelectItem value="1">Day D+1</SelectItem>
                                <SelectItem value="2">Day D+2</SelectItem>
                                <SelectItem value="3">Day D+3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              {...form.register(
                                `tasks.${index}.startTime` as const,
                              )}
                              onChange={(e) => {
                                const newValue = e.target.value;

                                // Get fresh state
                                const currentTasks = form.getValues().tasks;
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

                                // Update this task explicitly to ensure sync for calculation
                                // (register's onChange handles the form state, but 'currentTasks' is a snapshot)
                                form.setValue(
                                  `tasks.${index}.startTime`,
                                  newValue,
                                );
                                currentTasks[index].startTime = newValue;

                                if (delta !== 0) {
                                  updateDependentTasks(
                                    oldTask.tempId,
                                    delta,
                                    currentTasks,
                                  );
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration (min)</Label>
                            <Input
                              type="number"
                              disabled={field.type === "CUTOFF"}
                              {...form.register(
                                `tasks.${index}.duration` as const,
                                { valueAsNumber: true },
                              )}
                              onChange={(e) => {
                                const newDuration = Number(e.target.value);
                                form.setValue(
                                  `tasks.${index}.duration`,
                                  newDuration,
                                );

                                const currentTasks = form.getValues().tasks;
                                currentTasks[index].duration = newDuration;

                                // Check children for overlap
                                const childrenIndices = currentTasks
                                  .map((t, i) =>
                                    t.dependsOnTempId ===
                                    currentTasks[index].tempId
                                      ? i
                                      : -1,
                                  )
                                  .filter((i) => i !== -1);

                                childrenIndices.forEach((childIdx) => {
                                  enforceDependencyConstraint(
                                    childIdx,
                                    currentTasks[index].tempId,
                                    currentTasks,
                                  );
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Depends on (optional)</Label>
                          <Select
                            value={field.dependsOnTempId || "none"}
                            onValueChange={(val) => {
                              const newVal = val === "none" ? undefined : val;
                              const currentTasks = form.getValues().tasks;

                              // Update value
                              form.setValue(
                                `tasks.${index}.dependsOnTempId`,
                                newVal,
                              );
                              currentTasks[index].dependsOnTempId = newVal;
                              update(index, currentTasks[index]);

                              if (newVal) {
                                enforceDependencyConstraint(
                                  index,
                                  newVal,
                                  currentTasks,
                                );
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {getDependencyOptions(field.tempId).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SortableTaskItem>
              );
            })}
          </SortableContext>
        </DndContext>

        {fields.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            No tasks added. Click "Add Task" to start building your template.
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 sticky bottom-0 bg-background p-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : templateId
              ? "Update Template"
              : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
