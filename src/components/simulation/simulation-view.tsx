"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { getMasterTasks } from "@/app/actions/master-task";
import { TaskListEditor } from "@/components/shared/task-list-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTaskDependencies } from "@/hooks/use-task-dependencies";
import { GanttChart } from "./gantt-chart";

interface Task {
  tempId: string;
  name: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  type?: "PROCESS" | "CUTOFF";
  color?: string;
  sequenceOrder: number;
  dependsOnTempId?: string | null;
  taskId?: number;
  saveToMaster?: boolean;
  isCashConfirmed?: boolean;
  requiresWorkingHours?: boolean;
}

interface Template {
  id: number;
  name: string;
  templateTasks: any[];
}

interface FundProfile {
  id: number;
  name: string;
  officeStart?: string;
  officeEnd?: string;
  currentTemplate?: Template | null;
  targetTemplate?: Template | null;
}

interface SimulationViewProps {
  fund: FundProfile;
  simulationId?: number;
  onSave?: (
    currentTasks: Task[],
    targetTasks: Task[],
    metrics?: { reinvestmentGainHours?: number; idleTimeSavedMinutes?: number },
  ) => void;
  initialCurrentTasks?: Task[] | null;
  initialTargetTasks?: Task[] | null;
  isSaving?: boolean;
}

interface SimulationFormState {
  currentTasks: Task[];
  targetTasks: Task[];
}

interface MasterTask {
  id: number;
  name: string;
  duration: number;
  type: "PROCESS" | "CUTOFF";
  color: string;
  isCashConfirmed: boolean;
  requiresWorkingHours: boolean;
}

export function SimulationView({
  fund,
  simulationId,
  onSave,
  initialCurrentTasks,
  initialTargetTasks,
  isSaving = false,
}: SimulationViewProps) {
  const [mode, setMode] = useState<"current" | "target">("current");
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>([]);

  // Transform initial data to internal state
  const mapTasks = (tasks: any[]): Task[] => {
    if (!tasks) return [];
    return tasks.map((t) => ({
      tempId: t.tempId || t.id?.toString() || crypto.randomUUID(),
      name: t.name,
      dayOffset: t.dayOffset,
      startTime: t.startTime || "09:00",
      duration: t.duration,
      type: t.type,
      color: t.color,
      sequenceOrder: t.sequenceOrder || 0,
      dependsOnTempId: t.dependsOnTempId || t.dependsOnId?.toString() || null,
      taskId: t.taskId,
      saveToMaster: false,
      isCashConfirmed: t.isCashConfirmed,
      requiresWorkingHours: t.requiresWorkingHours,
    }));
  };

  const form = useForm<SimulationFormState>({
    defaultValues: {
      currentTasks: initialCurrentTasks
        ? mapTasks(initialCurrentTasks)
        : mapTasks(fund.currentTemplate?.templateTasks || []),
      targetTasks: initialTargetTasks
        ? mapTasks(initialTargetTasks)
        : mapTasks(fund.targetTemplate?.templateTasks || []),
    },
  });

  useEffect(() => {
    async function fetchMasterTasks() {
      const res = await getMasterTasks();
      if (res.success && res.data) {
        setMasterTasks(res.data as unknown as MasterTask[]);
      }
    }
    fetchMasterTasks();
  }, []);

  // Re-sync if fund prop changes
  useEffect(() => {
    if (!simulationId) {
      form.reset({
        currentTasks: mapTasks(fund.currentTemplate?.templateTasks || []),
        targetTasks: mapTasks(fund.targetTemplate?.templateTasks || []),
      });
      setMode("current");
    }
  }, [fund.id, simulationId, form]);

  const {
    adjustForWorkingHours,
    getAbsoluteMinutes,
    getDayAndTime,
    updateDependentTasks,
  } = useTaskDependencies({
    start: fund.officeStart || "09:00",
    end: fund.officeEnd || "17:00",
  });

  // Watch tasks for Gantt Chart
  const currentTasks = useWatch({
    control: form.control,
    name: "currentTasks",
  });
  const targetTasks = useWatch({ control: form.control, name: "targetTasks" });
  const activeTasks = mode === "current" ? currentTasks : targetTasks;
  const activeTasksFieldName =
    mode === "current" ? "currentTasks" : "targetTasks";

  // Custom update function for Gantt Chart dragging
  // This needs to update the form state, but respecting dependencies and working hours
  // The hook provides helper functions, but we must initiate the update via form.setValue / update
  // Since we are not inside TaskListEditor's useFieldArray here, we manipulate the array and setValue.

  const handleTaskUpdate = (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => {
    const tasks = [...activeTasks];
    const taskIndex = tasks.findIndex((t) => t.tempId === tempId);
    if (taskIndex === -1) return;

    // Apply working hours adjustment first
    // Only if the task requires working hours
    let adjustedDay = newDayOffset;
    let adjustedTime = newStartTime;

    const taskOfInterest = tasks.find((t) => t.tempId === tempId);

    if (taskOfInterest?.requiresWorkingHours) {
      const adjusted = adjustForWorkingHours(
        newDayOffset,
        newStartTime,
        newDuration,
      );
      adjustedDay = adjusted.dayOffset;
      adjustedTime = adjusted.startTime;
    }

    // Update the task itself
    const oldTask = tasks[taskIndex];
    const oldStart = getAbsoluteMinutes(oldTask.dayOffset, oldTask.startTime);
    const newStart = getAbsoluteMinutes(adjustedDay, adjustedTime);

    tasks[taskIndex] = {
      ...oldTask,
      dayOffset: adjustedDay,
      startTime: adjustedTime,
      duration: newDuration,
    };

    // Calculate delta and propagate
    const delta = newStart - oldStart;

    // We can use the hook logic if we adapt it.
    // updateDependentTasks expects UseFieldArrayUpdate, but we can mock it or use setValue
    // Actually, `updateDependentTasks` in the hook is designed for `useFieldArray`.
    // We can rewrite a simpler version here that works on the array directly since we will just setValue the whole array at end.

    // Update dependencies recursively on the local arrayCopy
    const updateDeps = (parentId: string, timeDiff: number) => {
      const dependentIndices = tasks
        .map((t, i) => (t.dependsOnTempId === parentId ? i : -1))
        .filter((i) => i !== -1);

      dependentIndices.forEach((idx) => {
        const depTask = tasks[idx];
        const currentStart = getAbsoluteMinutes(
          depTask.dayOffset,
          depTask.startTime,
        );
        const newStartTotal = currentStart + timeDiff;
        let { dayOffset, timeStr } = getDayAndTime(newStartTotal);

        if (depTask.requiresWorkingHours) {
          const adj = adjustForWorkingHours(
            dayOffset,
            timeStr,
            depTask.duration,
          );
          dayOffset = adj.dayOffset;
          timeStr = adj.startTime;
        }

        tasks[idx] = {
          ...depTask,
          dayOffset,
          startTime: timeStr,
        };

        // Recalculate delta for next children in case it clamped/shifted differently
        const actualNewStart = getAbsoluteMinutes(dayOffset, timeStr);
        const childDelta = actualNewStart - currentStart;

        if (childDelta !== 0) {
          updateDeps(depTask.tempId, childDelta);
        }
      });
    };

    if (delta !== 0) {
      updateDeps(tempId, delta);
    }

    form.setValue(activeTasksFieldName, tasks);
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{fund.name}</h2>
            <p className="text-muted-foreground text-sm">
              Evaluating{" "}
              {mode === "current"
                ? "Current Practice"
                : "Target Operating Model"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
              <Label
                htmlFor="mode-switch"
                className={
                  mode === "current" ? "font-bold" : "text-muted-foreground"
                }
              >
                Current
              </Label>
              <Switch
                id="mode-switch"
                checked={mode === "target"}
                onCheckedChange={(checked: boolean) =>
                  setMode(checked ? "target" : "current")
                }
              />
              <Label
                htmlFor="mode-switch"
                className={
                  mode === "target" ? "font-bold" : "text-muted-foreground"
                }
              >
                Target
              </Label>
            </div>

            {onSave && simulationId && (
              <Button
                onClick={() =>
                  onSave(
                    form.getValues().currentTasks,
                    form.getValues().targetTasks,
                  )
                }
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Interactive Gantt Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <GanttChart
                  tasks={activeTasks}
                  onTaskUpdate={handleTaskUpdate}
                  officeStart={fund.officeStart}
                  officeEnd={fund.officeEnd}
                />
              </CardContent>
            </Card>

            {/* Editor Section */}
            <TaskListEditor
              name={activeTasksFieldName}
              masterTasks={masterTasks}
              className="w-full"
              workingHours={{
                start: fund.officeStart || "09:00",
                end: fund.officeEnd || "17:00",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </FormProvider>
  );
}
