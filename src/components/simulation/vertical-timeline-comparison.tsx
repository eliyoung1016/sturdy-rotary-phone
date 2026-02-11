"use client";

import { Clock, DollarSign } from "lucide-react";
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
  isCashConfirmed?: boolean;
  requiresWorkingHours?: boolean;
}

interface VerticalTimelineComparisonProps {
  currentTasks: Task[];
  targetTasks: Task[];
  fundName: string;
  officeStart?: string;
  officeEnd?: string;
}

interface ComparisonMetrics {
  currentTotalMinutes: number;
  targetTotalMinutes: number;
  timeSavedMinutes: number;
}

interface DayGroup {
  dayOffset: number;
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  timeStr: string; // "HH:MM"
  date: Date;
  currentTasks: Task[];
  targetTasks: Task[];
}

export function VerticalTimelineComparison({
  currentTasks,
  targetTasks,
  fundName,
}: VerticalTimelineComparisonProps) {
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
    
    return {
      currentTotalMinutes,
      targetTotalMinutes,
      timeSavedMinutes: currentTotalMinutes - targetTotalMinutes,
    };
  }, [currentTasks, targetTasks]);

  const timelineData = useMemo(() => {
    const allDays = new Set<number>();
    [...currentTasks, ...targetTasks].forEach((t) => allDays.add(t.dayOffset));
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);

    return sortedDays.map((dayOffset) => {
      const timesSet = new Set<string>();
      [...currentTasks, ...targetTasks]
        .filter((t) => t.dayOffset === dayOffset)
        .forEach((t) => timesSet.add(t.startTime));

      const sortedTimes = Array.from(timesSet).sort();

      const timeSlots: TimeSlot[] = sortedTimes.map((timeStr) => {
        const [h, m] = timeStr.split(":").map(Number);
        const date = new Date(2026, 0, 1);
        date.setHours(h, m, 0, 0);

        return {
          timeStr,
          date,
          currentTasks: currentTasks.filter(
            (t) => t.dayOffset === dayOffset && t.startTime === timeStr,
          ),
          targetTasks: targetTasks.filter(
            (t) => t.dayOffset === dayOffset && t.startTime === timeStr,
          ),
        };
      });

      return { dayOffset, timeSlots };
    });
  }, [currentTasks, targetTasks]);

  const getDayLabel = (offset: number) => {
    if (offset === 0) return "Day 0 (D-Day)";
    if (offset > 0) return `Day +${offset}`;
    return `Day ${offset}`;
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
    const highlightedTasks = [...currentTasks, ...targetTasks].filter((t) =>
      isTaskHighlighted(t),
    );

    if (highlightedTasks.length < 2) {
      setConnections([]);
      return;
    }

    const sourceRef = taskRefs.current[hoveredTask.tempId || ""];
    if (!sourceRef) return;

    const sourceRect = sourceRef.getBoundingClientRect();
    const isSourceCurrent = currentTasks.some(t => t.tempId === hoveredTask.tempId);
    
    // If current (left), start from right edge. If target (right), start from left edge.
    const sourceX = isSourceCurrent 
      ? sourceRect.right - containerRect.left
      : sourceRect.left - containerRect.left;
    const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top;

    const newConnections = highlightedTasks
      .filter((t) => t.tempId !== hoveredTask.tempId)
      .map((targetTask) => {
        const targetRef = taskRefs.current[targetTask.tempId || ""];
        if (!targetRef) return null;

        const targetRect = targetRef.getBoundingClientRect();
        const isTargetCurrent = currentTasks.some(t => t.tempId === targetTask.tempId);
        
        // If target is current (left), line ends at its right edge.
        // If target is target (right), line ends at its left edge.
        const targetX = isTargetCurrent
          ? targetRect.right - containerRect.left
          : targetRect.left - containerRect.left;

        return {
          x1: sourceX,
          y1: sourceY,
          x2: targetX,
          y2: targetRect.top + targetRect.height / 2 - containerRect.top,
        };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];

    setConnections(newConnections);
  }, [hoveredTask, currentTasks, targetTasks]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative" ref={containerRef}>
      <svg
        className="absolute inset-0 pointer-events-none z-30"
        style={{ width: "100%", height: "100%" }}
      >
        {connections.map((conn, i) => {
          // Create a smooth horizontal S-curve
          const midX = (conn.x1 + conn.x2) / 2;
          const path = `M ${conn.x1} ${conn.y1} C ${midX} ${conn.y1}, ${midX} ${conn.y2}, ${conn.x2} ${conn.y2}`;
          
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

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-muted-foreground mb-2">
            Comparison Mode
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">{fundName}</h2>
          <p className="text-muted-foreground"> Current vs. Target Process</p>
        </div>

        <ComparisonSummary
          currentTotalMinutes={metrics.currentTotalMinutes}
          targetTotalMinutes={metrics.targetTotalMinutes}
        />
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden md:block" />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 mb-8 sticky top-0 bg-background z-20 py-4 border-b">
          <div className="hidden md:flex justify-end px-4 items-center gap-2">
            <h3 className="text-lg font-semibold text-blue-700">Current Practice</h3>
          </div>
          <div className="w-16 md:w-auto" />
          <div className="hidden md:flex justify-start px-4 items-center gap-2">
            <h3 className="text-lg font-semibold text-green-700">Target Practice</h3>
          </div>
        </div>

        <div className="space-y-12">
          {timelineData.map((day) => (
            <div key={day.dayOffset} className="space-y-6">
              <div className="flex justify-center relative z-10">
                <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold bg-background border shadow-sm">
                  {getDayLabel(day.dayOffset)}
                </Badge>
              </div>

              <div className="space-y-2">
                {day.timeSlots.map((slot) => (
                  <div key={`${day.dayOffset}-${slot.timeStr}`} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-start group">
                    <div className="flex flex-col items-end space-y-2 md:text-right order-2 md:order-1 px-4 md:px-0">
                      {slot.currentTasks.map((task, idx) => (
                        <div key={task.tempId || idx} ref={(el) => { taskRefs.current[task.tempId || ""] = el; }}>
                          <TaskCard
                            task={task}
                            isHighlighted={isTaskHighlighted(task)}
                            onHover={setHoveredTask}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-center order-1 md:order-2 py-2 sticky top-20 bg-background/80 backdrop-blur-sm z-10 md:static md:bg-transparent">
                      <div className="flex items-center justify-center w-16 md:w-auto">
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background">
                          {slot.timeStr}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-start space-y-2 order-3 px-4 md:px-0">
                      {slot.targetTasks.map((task, idx) => (
                        <div key={task.tempId || idx} ref={(el) => { taskRefs.current[task.tempId || ""] = el; }}>
                          <TaskCard
                            task={task}
                            isHighlighted={isTaskHighlighted(task)}
                            onHover={setHoveredTask}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  isHighlighted,
  onHover,
}: {
  task: Task;
  isHighlighted: boolean;
  onHover: (task: Task | null) => void;
}) {
  const taskColorObj = TASK_COLORS.find((c) => c.value === task.color);
  const colorVar = taskColorObj?.color || "var(--primary)";

  const borderColor = isHighlighted
    ? colorVar
    : `color-mix(in srgb, ${colorVar}, transparent 50%)`;

  const style = {
    backgroundColor: isHighlighted
      ? `color-mix(in srgb, ${colorVar}, transparent 70%)`
      : `color-mix(in srgb, ${colorVar}, transparent 85%)`,
    borderTopColor: borderColor,
    borderRightColor: borderColor,
    borderBottomColor: borderColor,
    borderLeftWidth: "4px",
    borderLeftColor: colorVar,
    transform: isHighlighted ? "scale(1.02)" : "scale(1)",
    zIndex: isHighlighted ? 40 : 1,
  };

  return (
    <div
      className={cn(
        "rounded-r-lg rounded-l-sm border-t border-r border-b px-3 py-2 w-full max-w-[300px] shadow-sm transition-all cursor-pointer relative",
        !isHighlighted && "opacity-80 grayscale-[0.2]",
        isHighlighted && "shadow-md ring-2 ring-primary/20",
      )}
      style={style}
      onMouseEnter={() => onHover(task)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 max-w-[80%]">
          <span className="text-xs font-semibold leading-tight text-foreground">{task.name}</span>
        </div>
        <span className="text-[10px] font-mono shrink-0 text-muted-foreground">{task.duration}m</span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {task.type && <div className="text-[10px] uppercase text-muted-foreground">{task.type}</div>}
        <div className="flex items-center gap-1.5 ml-auto">
          {task.isCashConfirmed && (
            <div title="Cash Confirmed" className="bg-green-100 rounded-full p-0.5">
              <DollarSign className="w-3 h-3 text-green-700" />
            </div>
          )}
          {task.requiresWorkingHours && (
            <div title="Requires Working Hours" className="bg-blue-100 rounded-full p-0.5">
              <Clock className="w-3 h-3 text-blue-700" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}