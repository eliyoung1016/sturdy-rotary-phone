"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TaskListEditor } from "@/components/shared/task-list-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/use-debounce";
import { useSimulationStore } from "@/store/simulation-store";
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

// No longer need wrapper if we use Zustand directly
// GanttChart will now subscribe to the store directly


export function SimulationView({
  fund,
  simulationId,
  onSave,
  initialCurrentTasks,
  initialTargetTasks,
  isSaving = false,
  masterTasks = [],
}: SimulationViewProps) {
  const {
    mode,
    setMode,
    setTasks,
    setWorkingHours,
    moveTask,
    updateTaskDuration,
    _getActiveTasks
  } = useSimulationStore();

  const activeTasks = _getActiveTasks();
  const debouncedTasks = useDebounce(activeTasks, 200) || [];

  // Transform initial data to internal state
  const mapTasks = useCallback((tasks: any[]): TaskItem[] => {
    if (!tasks) return [];
    return tasks.map((t) => ({
      tempId: t.tempId || t.id?.toString() || crypto.randomUUID(),
      name: t.name,
      shortName: t.shortName || t.masterTask?.shortName || undefined,
      dayOffset: t.dayOffset,
      startTime: t.startTime || "09:00",
      duration: t.duration,
      type: t.type,
      color: t.color,
      sequenceOrder: t.sequenceOrder || 0,
      dependsOnTempId: t.dependsOnTempId || t.dependsOnId?.toString() || null,
      dependsOnId: t.dependsOnId,
      taskId: t.taskId,
      correspondingTaskId: t.correspondingTaskId || t.masterTask?.correspondingTaskId || null,
      saveToMaster: false,
      isCashConfirmed: t.isCashConfirmed,
      requiresWorkingHours: t.requiresWorkingHours,
      dependencyType: t.dependencyType,
      dependencyDelay: t.dependencyDelay,
    }));
  }, []);

  // Initialize Store
  useEffect(() => {
    const current = initialCurrentTasks ? mapTasks(initialCurrentTasks) : mapTasks(fund.currentTemplate?.templateTasks || []);
    const target = initialTargetTasks ? mapTasks(initialTargetTasks) : mapTasks(fund.targetTemplate?.templateTasks || []);
    setTasks('current', current);
    setTasks('target', target);
    setWorkingHours({
      start: fund.officeStart || "09:00",
      end: fund.officeEnd || "17:00",
    });
    setMode('current');
    // Only run this when fund/simulationId changes drastically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId, fund.id]);

  const handleTaskUpdate = (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => {
    // 1. Duration Update Check
    // Get latest non-debounced task from store to compare
    const currentTask = useSimulationStore.getState()._getActiveTasks().find(t => t.tempId === tempId);
    if (!currentTask) return;

    if (currentTask.duration !== newDuration) {
      updateTaskDuration(tempId, newDuration);
    }

    // 2. Position Update Check
    if (currentTask.dayOffset !== newDayOffset || currentTask.startTime !== newStartTime) {
      moveTask(tempId, newDayOffset, newStartTime);
    }
  };

  return (
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
              onClick={() => {
                const state = useSimulationStore.getState();
                onSave(
                  state.currentTasks,
                  state.targetTasks,
                )
              }}
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
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="space-y-6">
            {/* Interactive Gantt Chart */}
            <Card className="bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden">
              <CardHeader className="bg-muted/5 border-b border-border/50">
                <CardTitle className="text-xl font-medium tracking-tight">Time-Warp Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <GanttChart
                  tasks={debouncedTasks}
                  onTaskUpdate={handleTaskUpdate}
                  officeStart={fund.officeStart}
                  officeEnd={fund.officeEnd}
                />
              </CardContent>
            </Card>
          </div>

          {/* Editor Section */}
          <div className="mt-12">
            <h3 className="text-lg font-medium tracking-tight mb-4 px-1">Configuration & Task Details</h3>
            <div className="bg-background/40 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl p-1 overflow-hidden">
              <TaskListEditor
                tasks={activeTasks}
                masterTasks={masterTasks}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
