"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { ComparisonSummary } from "@/components/simulation/comparison-summary";
import { TASK_COLORS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";

interface Task {
  tempId?: string;
  id?: number;
  taskId?: number;
  correspondingTaskId?: number | null;
  name: string;
  dayOffset: number;
  startTime: string;
  duration: number;
  type?: "PROCESS" | "CUTOFF";
  color?: string;
}

interface HorizontalTimelineComparisonProps {
  currentTasks: Task[];
  targetTasks: Task[];
  fundName: string;
}

interface ComparisonMetrics {
  currentTotalMinutes: number;
  targetTotalMinutes: number;
  timeSavedMinutes: number;
  timeSavedHours: number;
  percentageSaved: number;
}

export function HorizontalTimelineComparison({
  currentTasks,
  targetTasks,
  fundName,
}: HorizontalTimelineComparisonProps) {
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const metrics: ComparisonMetrics = useMemo(() => {
    const calcDuration = (tasks: Task[]) => {
      if (!tasks.length) return 0;
      const times = tasks.map((t) => {
        const [h, m] = t.startTime.split(":").map(Number);
        const start = t.dayOffset * 24 * 60 + h * 60 + m;
        return { start, end: start + t.duration };
      });
      const minStart = Math.min(...times.map((t) => t.start));
      const maxEnd = Math.max(...times.map((t) => t.end));
      return maxEnd - minStart;
    };

    const currentTotalMinutes = calcDuration(currentTasks);
    const targetTotalMinutes = calcDuration(targetTasks);
    const timeSavedMinutes = currentTotalMinutes - targetTotalMinutes;

    return {
      currentTotalMinutes,
      targetTotalMinutes,
      timeSavedMinutes,
      timeSavedHours: Math.round((timeSavedMinutes / 60) * 10) / 10,
      percentageSaved: currentTotalMinutes > 0 ? Math.round((timeSavedMinutes / currentTotalMinutes) * 100) : 0,
    };
  }, [currentTasks, targetTasks]);

  const { minMinutes, maxMinutes, totalMinutes } = useMemo(() => {
    const allTasks = [...currentTasks, ...targetTasks];
    if (!allTasks.length) return { minMinutes: 0, maxMinutes: 24 * 60, totalMinutes: 24 * 60 };

    let min = Infinity;
    let max = -Infinity;

    const getAbsoluteMinutes = (dayOffset: number, timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return dayOffset * 24 * 60 + hours * 60 + minutes;
    };

    allTasks.forEach((t) => {
      const start = getAbsoluteMinutes(t.dayOffset, t.startTime);
      const end = start + t.duration;
      if (start < min) min = start;
      if (end > max) max = end;
    });

    min -= 60;
    max += 60;

    const startHour = Math.floor(min / 60);
    const endHour = Math.ceil(max / 60);

    return {
      minMinutes: startHour * 60,
      maxMinutes: endHour * 60,
      totalMinutes: (endHour - startHour) * 60,
    };
  }, [currentTasks, targetTasks]);

  const getAbsoluteMinutes = (dayOffset: number, timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return dayOffset * 24 * 60 + hours * 60 + minutes;
  };

  const getPositionStyle = (task: Task) => {
    const startMins = getAbsoluteMinutes(task.dayOffset, task.startTime);
    const leftPercent = ((startMins - minMinutes) / totalMinutes) * 100;
    const widthPercent = (task.duration / totalMinutes) * 100;
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 0.2)}%`,
    };
  };

  const isTaskHighlighted = (task: Task) => {
    if (!hoveredTask) return false;
    if (task.tempId === hoveredTask.tempId) return true;
    if (hoveredTask.correspondingTaskId && task.taskId === hoveredTask.correspondingTaskId) return true;
    if (task.correspondingTaskId && hoveredTask.taskId === task.correspondingTaskId) return true;
    if (task.name === hoveredTask.name) return true;
    return false;
  };

  const [connections, setConnections] = useState<
    { x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  useEffect(() => {
    if (!hoveredTask || !containerRef.current) {
      setConnections([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const highlightedTasks = [...currentTasks, ...targetTasks].filter(t => isTaskHighlighted(t));

    if (highlightedTasks.length < 2) {
      setConnections([]);
      return;
    }

    const sourceRef = taskRefs.current[hoveredTask.tempId || ""];
    if (!sourceRef) return;

    const sourceRect = sourceRef.getBoundingClientRect();
    const isSourceCurrent = currentTasks.some(t => t.tempId === hoveredTask.tempId);
    
    // If current (top lane), start from bottom. If target (bottom lane), start from top.
    const sourceX = sourceRect.left + sourceRect.width / 2 - containerRect.left;
    const sourceY = isSourceCurrent
      ? sourceRect.bottom - containerRect.top
      : sourceRect.top - containerRect.top;

    const newConnections = highlightedTasks
      .filter(t => t.tempId !== hoveredTask.tempId)
      .map(targetTask => {
        const targetRef = taskRefs.current[targetTask.tempId || ""];
        if (!targetRef) return null;
        const targetRect = targetRef.getBoundingClientRect();
        const isTargetCurrent = currentTasks.some(t => t.tempId === targetTask.tempId);

        // If target is current (top lane), end at bottom. If target is target (bottom lane), end at top.
        const targetY = isTargetCurrent
          ? targetRect.bottom - containerRect.top
          : targetRect.top - containerRect.top;

        return {
          x1: sourceX,
          y1: sourceY,
          x2: targetRect.left + targetRect.width / 2 - containerRect.left,
          y2: targetY,
        };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];

    setConnections(newConnections);
  }, [hoveredTask, currentTasks, targetTasks]);

  const getTaskColor = (task: Task) => {
    const colorObj = TASK_COLORS.find((c) => c.value === task.color);
    return colorObj?.color || "var(--primary)";
  };

  const startDay = Math.floor(minMinutes / (24 * 60));
  const endDay = Math.ceil(maxMinutes / (24 * 60));
  const days = Array.from({ length: endDay - startDay }, (_, i) => startDay + i);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <Badge variant="outline" className="text-muted-foreground mb-1">Horizontal Comparison</Badge>
          <h2 className="text-2xl font-bold tracking-tight">{fundName}</h2>
          <p className="text-muted-foreground text-sm">Compact Timeline Overview</p>
        </div>
        <ComparisonSummary currentTotalMinutes={metrics.currentTotalMinutes} targetTotalMinutes={metrics.targetTotalMinutes} />
      </div>

      <div className="border rounded-lg bg-background p-4 overflow-x-auto relative" ref={containerRef}>
        <svg className="absolute inset-0 pointer-events-none z-30" style={{ width: "100%", height: "100%" }}>
          {connections.map((conn, i) => {
            // Create a smooth vertical S-curve
            const midY = (conn.y1 + conn.y2) / 2;
            const path = `M ${conn.x1} ${conn.y1} C ${conn.x1} ${midY}, ${conn.x2} ${midY}, ${conn.x2} ${conn.y2}`;
            
            return (
              <motion.path
                key={i}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 2"
                className="text-primary/40"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
            );
          })}
        </svg>

        <div className="min-w-[800px] relative">
          {/* Day Labels Header */}
          <div className="relative h-6 mb-1">
            {days.map((day) => {
              const dayStartMins = day * 24 * 60;
              const dayEndMins = (day + 1) * 24 * 60;
              const visibleStart = Math.max(dayStartMins, minMinutes);
              const visibleEnd = Math.min(dayEndMins, maxMinutes);
              if (visibleEnd <= visibleStart) return null;
              const leftPercent = ((visibleStart - minMinutes) / totalMinutes) * 100;
              const widthPercent = ((visibleEnd - visibleStart) / totalMinutes) * 100;
              return (
                <div key={`day-${day}`} className="absolute top-0 h-full border-l first:border-l-0 border-r border-border/50 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/10 truncate px-1" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}>
                  Day {day}
                </div>
              );
            })}
          </div>

          {/* Time Scale Header */}
          <div className="relative h-6 border-b text-xs text-muted-foreground mb-4">
            {Array.from({ length: totalMinutes / 60 + 1 }).map((_, i) => {
              const minuteTick = minMinutes + i * 60;
              const leftPercent = ((minuteTick - minMinutes) / totalMinutes) * 100;
              if (leftPercent > 100) return null;
              const showLabel = i % 2 === 0;
              return (
                <div key={i} className="absolute bottom-0 border-l border-border/50 h-full flex items-end pl-1 pb-1" style={{ left: `${leftPercent}%` }}>
                  {showLabel && <span className="transform -translate-x-1/2">{Math.floor((minuteTick / 60) % 24)}:00</span>}
                </div>
              );
            })}
          </div>

          <div className="space-y-6 relative z-10">
            {/* Current Practice Lane */}
            <div className="relative group/lane">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-semibold text-blue-900">Current Practice</h3>
              </div>
              <div className="relative h-10 bg-muted/20 rounded border border-blue-100">
                {currentTasks.map((task) => (
                  <div
                    key={task.tempId || task.id}
                    ref={(el) => { taskRefs.current[task.tempId || ""] = el; }}
                    className={cn(
                      "absolute top-1 bottom-1 rounded-sm shadow-sm transition-all cursor-help hover:z-20",
                      isTaskHighlighted(task) ? "ring-2 ring-primary scale-y-110 z-20" : "opacity-80"
                    )}
                    style={{
                      ...getPositionStyle(task),
                      backgroundColor: getTaskColor(task),
                    }}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    title={`${task.name} (${task.startTime}, ${task.duration}m)`}
                  />
                ))}
              </div>
            </div>

            {/* Target Practice Lane */}
            <div className="relative group/lane">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 bg-green-500 rounded-full" />
                <h3 className="text-sm font-semibold text-green-900">Target Practice</h3>
              </div>
              <div className="relative h-10 bg-muted/20 rounded border border-green-100">
                {targetTasks.map((task) => (
                  <div
                    key={task.tempId || task.id}
                    ref={(el) => { taskRefs.current[task.tempId || ""] = el; }}
                    className={cn(
                      "absolute top-1 bottom-1 rounded-sm shadow-sm transition-all cursor-help hover:z-20",
                      isTaskHighlighted(task) ? "ring-2 ring-primary scale-y-110 z-20" : "opacity-80"
                    )}
                    style={{
                      ...getPositionStyle(task),
                      backgroundColor: getTaskColor(task),
                    }}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    title={`${task.name} (${task.startTime}, ${task.duration}m)`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}