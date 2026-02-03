"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { TaskListEditor } from "@/components/shared/task-list-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/use-debounce";
import { useTaskDependencies } from "@/hooks/use-task-dependencies";
import type {
  MasterTask,
  SimulationFundProfile,
  TaskItem,
} from "@/types/simulation";
import { GanttChart } from "./gantt-chart";

interface SimulationViewProps {
  fund: SimulationFundProfile;
  simulationId?: number;
  onSave?: (
    currentTasks: TaskItem[],
    targetTasks: TaskItem[],
    metrics?: { reinvestmentGainHours?: number; idleTimeSavedMinutes?: number },
  ) => void;
  initialCurrentTasks?: TaskItem[] | null;
  initialTargetTasks?: TaskItem[] | null;
  isSaving?: boolean;
  masterTasks?: MasterTask[];
}

interface SimulationFormState {
  currentTasks: TaskItem[];
  targetTasks: TaskItem[];
}

export function SimulationView({
  fund,
  simulationId,
  onSave,
  initialCurrentTasks,
  initialTargetTasks,
  isSaving = false,
  masterTasks = [],
}: SimulationViewProps) {
  const [mode, setMode] = useState<"current" | "target">("current");

  // Transform initial data to internal state
  const mapTasks = useCallback((tasks: any[]): TaskItem[] => {
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
      dependsOnId: t.dependsOnId,
      taskId: t.taskId,
      saveToMaster: false,
      isCashConfirmed: t.isCashConfirmed,
      requiresWorkingHours: t.requiresWorkingHours,
      dependencyType: t.dependencyType,
      dependencyDelay: t.dependencyDelay,
    }));
  }, []);

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

  // Re-sync if fund prop changes
  useEffect(() => {
    if (!simulationId) {
      form.reset({
        currentTasks: mapTasks(fund.currentTemplate?.templateTasks || []),
        targetTasks: mapTasks(fund.targetTemplate?.templateTasks || []),
      });
      setMode("current");
    }
  }, [simulationId, form, mapTasks, fund.currentTemplate, fund.targetTemplate]);

  const workingHours = useMemo(
    () => ({
      start: fund.officeStart || "09:00",
      end: fund.officeEnd || "17:00",
    }),
    [fund.officeStart, fund.officeEnd],
  );

  const { updateTaskOnMove } = useTaskDependencies(workingHours);

  // Watch tasks for Gantt Chart
  const currentTasks = useWatch({
    control: form.control,
    name: "currentTasks",
  });
  const targetTasks = useWatch({ control: form.control, name: "targetTasks" });
  const activeTasks = mode === "current" ? currentTasks : targetTasks;
  const activeTasksFieldName =
    mode === "current" ? "currentTasks" : "targetTasks";

  // Debounce the tasks for the Gantt Chart to avoid lag
  const debouncedActiveTasks = useDebounce(activeTasks, 200);

  const handleTaskUpdate = (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => {
    const tasks = [...activeTasks];
    const taskIndex = tasks.findIndex((t) => t.tempId === tempId);
    if (taskIndex === -1) return;

    // Use shared logic for update, which handles recursion, working hours, and constraints
    // Note: updating duration is same as "moving" if we only change duration property first?
    // updateTaskOnMove takes (index, day, time, list).
    // If duration changed, we should probably update it in the list first, then call updateTaskOnMove?
    // Actually updateTaskOnMove logic in hook only looks at duration for working hours calculation of self
    // and subsequent children.

    // If duration changed, we must update it first.
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      duration: newDuration,
    };

    const updatedTasks = updateTaskOnMove(
      taskIndex,
      newDayOffset,
      newStartTime,
      tasks,
    );

    form.setValue(activeTasksFieldName, updatedTasks);
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
                  tasks={debouncedActiveTasks || []}
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
              workingHours={workingHours}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </FormProvider>
  );
}
