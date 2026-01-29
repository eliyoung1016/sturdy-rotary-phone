"use client";

import React, { useState, useEffect } from "react";
import { GanttChart } from "./gantt-chart";
import { TaskEditor } from "./task-editor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2 } from "lucide-react";

interface Task {
  tempId: string;
  name: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  type?: "PROCESS" | "CUTOFF";
  color?: string;
  sequenceOrder: number;
  dependsOnId?: number | null;
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
    metrics?: { reinvestmentGainHours?: number; idleTimeSavedMinutes?: number }
  ) => void;
  initialCurrentTasks?: Task[] | null;
  initialTargetTasks?: Task[] | null;
  isSaving?: boolean;
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
      sequenceOrder: t.sequenceOrder,
      dependsOnId: t.dependsOnId || null,
    }));
  };

  const [currentTasks, setCurrentTasks] = useState<Task[]>(
    initialCurrentTasks
      ? mapTasks(initialCurrentTasks)
      : mapTasks(fund.currentTemplate?.templateTasks || [])
  );

  const [targetTasks, setTargetTasks] = useState<Task[]>(
    initialTargetTasks
      ? mapTasks(initialTargetTasks)
      : mapTasks(fund.targetTemplate?.templateTasks || [])
  );

  // Re-sync if fund prop changes (e.g. user selected different fund)
  useEffect(() => {
    if (!simulationId) {
      setCurrentTasks(mapTasks(fund.currentTemplate?.templateTasks || []));
      setTargetTasks(mapTasks(fund.targetTemplate?.templateTasks || []));
      setMode("current");
    }
  }, [fund.id, simulationId]);

  const activeTasks = mode === "current" ? currentTasks : targetTasks;
  const setActiveTasks = mode === "current" ? setCurrentTasks : setTargetTasks;

  // Helper: Convert time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper: Convert minutes to time string
  const minutesToTime = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Helper: Get absolute minutes from day offset and time
  const getAbsoluteMinutes = (dayOffset: number, timeStr: string): number => {
    return dayOffset * 24 * 60 + timeToMinutes(timeStr);
  };

  // Helper: Adjust task to fit within working hours
  const adjustForWorkingHours = (
    dayOffset: number,
    startTime: string,
    duration: number,
  ): { dayOffset: number; startTime: string } => {
    const officeStartMins = timeToMinutes(fund.officeStart || "09:00");
    const officeEndMins = timeToMinutes(fund.officeEnd || "17:00");
    const startMins = timeToMinutes(startTime);
    const endMins = startMins + duration;

    // If task ends after office hours, push to next day
    if (endMins > officeEndMins) {
      return {
        dayOffset: dayOffset + 1,
        startTime: fund.officeStart || "09:00",
      };
    }

    // If task starts before office hours, move to office start
    if (startMins < officeStartMins) {
      return {
        dayOffset,
        startTime: fund.officeStart || "09:00",
      };
    }

    return { dayOffset, startTime };
  };

  const handleTaskUpdate = (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => {
    setActiveTasks((prev) => {
      // First, adjust the primary task for working hours
      const adjusted = adjustForWorkingHours(newDayOffset, newStartTime, newDuration);
      
      // Create a map for quick lookup
      const taskMap = new Map(prev.map((t) => [t.tempId, t]));
      const updatedTasks = new Map<string, Task>();

      // Update the primary task
      const primaryTask = taskMap.get(tempId);
      if (primaryTask) {
        updatedTasks.set(tempId, {
          ...primaryTask,
          dayOffset: adjusted.dayOffset,
          startTime: adjusted.startTime,
          duration: newDuration,
        });
      }

      // Function to recursively update parent (dependency) if pushed forward
      const updateParents = (updatedTaskId: string) => {
        const updatedTask = updatedTasks.get(updatedTaskId) || taskMap.get(updatedTaskId);
        if (!updatedTask || !updatedTask.dependsOnId) return;

        // Find the parent task this depends on
        const parentId = updatedTask.dependsOnId.toString();
        const parent = updatedTasks.get(parentId) || taskMap.get(parentId);
        if (!parent) return;

        // Calculate when the updated task starts
        const taskStartAbsMins = getAbsoluteMinutes(
          updatedTask.dayOffset,
          updatedTask.startTime,
        );

        // Calculate when the parent ends
        const parentStartAbsMins = getAbsoluteMinutes(
          parent.dayOffset,
          parent.startTime,
        );
        const parentEndAbsMins = parentStartAbsMins + parent.duration;

        // If the task starts before or at the same time as parent ends, push parent forward
        if (taskStartAbsMins < parentEndAbsMins) {
          // Calculate how much to push the parent
          const requiredParentEndMins = taskStartAbsMins;
          const newParentStartMins = requiredParentEndMins - parent.duration;
          
          const newParentDayOffset = Math.floor(newParentStartMins / (24 * 60));
          const newParentStartMinsInDay = newParentStartMins % (24 * 60);
          const newParentStartTime = minutesToTime(newParentStartMinsInDay);

          // Adjust for working hours
          const parentAdjusted = adjustForWorkingHours(
            newParentDayOffset,
            newParentStartTime,
            parent.duration,
          );

          updatedTasks.set(parentId, {
            ...parent,
            dayOffset: parentAdjusted.dayOffset,
            startTime: parentAdjusted.startTime,
          });

          // Recursively update the parent's parent
          updateParents(parentId);
        }
      };

      // Function to recursively update dependent tasks
      const updateDependents = (updatedTaskId: string) => {
        const updatedTask = updatedTasks.get(updatedTaskId) || taskMap.get(updatedTaskId);
        if (!updatedTask) return;

        // Find all tasks that depend on this task
        const dependents = prev.filter(
          (t) => t.dependsOnId?.toString() === updatedTaskId,
        );

        dependents.forEach((dependent) => {
          // Calculate when the dependency ends
          const depStartAbsMins = getAbsoluteMinutes(
            updatedTask.dayOffset,
            updatedTask.startTime,
          );
          const depEndAbsMins = depStartAbsMins + updatedTask.duration;

          // Dependent task should start after dependency ends
          const newDepDayOffset = Math.floor(depEndAbsMins / (24 * 60));
          const newDepStartMins = depEndAbsMins % (24 * 60);
          const newDepStartTime = minutesToTime(newDepStartMins);

          // Adjust for working hours
          const depAdjusted = adjustForWorkingHours(
            newDepDayOffset,
            newDepStartTime,
            dependent.duration,
          );

          updatedTasks.set(dependent.tempId, {
            ...dependent,
            dayOffset: depAdjusted.dayOffset,
            startTime: depAdjusted.startTime,
          });

          // Recursively update tasks that depend on this dependent
          updateDependents(dependent.tempId);
        });
      };

      // Start the upward cascade (push parents if needed)
      updateParents(tempId);

      // Then cascade downward (update dependents)
      updateDependents(tempId);

      // Merge updates back into the task list
      return prev.map((t) => updatedTasks.get(t.tempId) || t);
    });
  };

  const handleEditorUpdate = (index: number, field: keyof Task, value: any) => {
    const task = activeTasks[index];
    if (!task) return;

    // If timing-related fields are updated, use the cascading update logic
    if (field === "dayOffset" || field === "startTime" || field === "duration") {
      const updatedTask = { ...task, [field]: value };
      handleTaskUpdate(
        task.tempId,
        field === "dayOffset" ? value : task.dayOffset,
        field === "startTime" ? value : task.startTime,
        field === "duration" ? value : task.duration,
      );
    } else {
      // For other fields, just update directly
      setActiveTasks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    }
  };

  // Switch Animation Variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{fund.name}</h2>
          <p className="text-muted-foreground text-sm">
            Evaluating{" "}
            {mode === "current" ? "Current Practice" : "Target Operating Model"}
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
              onClick={() => onSave(currentTasks, targetTasks)}
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
          <Card>
            <CardHeader>
              <CardTitle>Task Details & Cutoffs</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskEditor tasks={activeTasks} onUpdate={handleEditorUpdate} />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
