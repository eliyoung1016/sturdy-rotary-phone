"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, DollarSign } from "lucide-react";

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
  shortName?: string;
  dayOffset: number;
  startTime: string;
  duration: number;
  type?: "PROCESS" | "CUTOFF";
  color?: string;
  isCashConfirmed?: boolean;
  requiresWorkingHours?: boolean;
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContentWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

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
    const isCutoff = task.duration === 0;

    return {
      left: `${leftPercent}%`,
      width: isCutoff ? "4px" : `${Math.max(widthPercent, 0.1)}%`,
      transform: isCutoff ? "translateX(-50%)" : "none",
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

        <div className="min-w-[1200px] relative" ref={contentRef}>
          {/* Day Headers */}
          <div className="relative h-6 mb-1 flex border-b bg-muted/5">
            {days.map((day) => {
              const dayStartMins = day * 24 * 60;
              const dayEndMins = (day + 1) * 24 * 60;
              const visibleStart = Math.max(dayStartMins, minMinutes);
              const visibleEnd = Math.min(dayEndMins, maxMinutes);
              if (visibleEnd <= visibleStart) return null;
              const leftPercent = ((visibleStart - minMinutes) / totalMinutes) * 100;
              const widthPercent = ((visibleEnd - visibleStart) / totalMinutes) * 100;
              return (
                <div key={`day-${day}`} className="absolute top-0 h-full border-r border-border/40 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}>
                  Day {day}
                </div>
              );
            })}
          </div>

          {/* Time scale */}
          <div className="relative h-6 border-b text-[9px] text-muted-foreground/60 mb-6 font-mono">
            {Array.from({ length: totalMinutes / 60 + 1 }).map((_, i) => {
              const minuteTick = minMinutes + i * 60;
              const leftPercent = ((minuteTick - minMinutes) / totalMinutes) * 100;
              if (leftPercent > 100) return null;
              const showLabel = i % 2 === 0;
              return (
                <div key={i} className="absolute bottom-0 border-l border-border/20 h-2 flex items-end pl-1" style={{ left: `${leftPercent}%` }}>
                  {showLabel && <span className="transform -translate-x-1/2 mb-2">{Math.floor((minuteTick / 60) % 24)}:00</span>}
                </div>
              );
            })}
          </div>

          <div className="space-y-16 relative z-10">
            {[
              { label: "Current Practice", tasks: currentTasks, color: "blue" },
              { label: "Target Practice", tasks: targetTasks, color: "green" }
            ].map((lane) => (
              <div 
                key={lane.label} 
                className={cn(
                  "relative group/lane", 
                  hoveredTask && lane.tasks.some(t => t.tempId === hoveredTask.tempId) ? "z-40" : "z-10"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("h-2.5 w-2.5 rounded-full", lane.color === "blue" ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.4)]")} />
                  <h3 className={cn("text-xs font-black uppercase tracking-widest", lane.color === "blue" ? "text-blue-900" : "text-green-900")}>
                    {lane.label}
                  </h3>
                </div>
                <div className={cn("relative h-14 bg-muted/5 rounded-lg border shadow-inner", lane.color === "blue" ? "border-blue-100/50" : "border-green-100/50")}>
                  {lane.tasks.map((task) => (
                    <div
                      key={task.tempId || task.id}
                      ref={(el) => { taskRefs.current[task.tempId || ""] = el; }}
                      className={cn(
                        "absolute top-1.5 bottom-1.5 rounded-md shadow-sm transition-all cursor-help flex items-center justify-center overflow-visible",
                        isTaskHighlighted(task) ? "ring-2 ring-primary scale-y-105 z-20 shadow-md" : "opacity-90 hover:opacity-100"
                      )}
                      style={{
                        ...getPositionStyle(task),
                        backgroundColor: getTaskColor(task),
                      }}
                      onMouseEnter={() => setHoveredTask(task)}
                      onMouseLeave={() => setHoveredTask(null)}
                    >
                      <TaskLabel 
                        task={task} 
                        isHovered={isTaskHighlighted(task)} 
                        contentWidth={contentWidth} 
                        totalMinutes={totalMinutes} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskLabel({ 
  task, 
  isHovered, 
  contentWidth, 
  totalMinutes 
}: { 
  task: Task; 
  isHovered: boolean;
  contentWidth: number;
  totalMinutes: number;
}) {
  const isCutoff = task.duration === 0;
  // Use a fallback if contentWidth hasn't been measured yet
  const actualWidth = contentWidth || 1200;
  const availableWidth = (task.duration / totalMinutes) * actualWidth;
  
  // More accurate width calculation for 11px bold font
  const charWidth = 5.8; 
  const padding = 12; // total horizontal padding
  const nameWidth = task.name.length * charWidth + padding;
  const shortNameWidth = (task.shortName?.length || 0) * charWidth + padding;

  const canFitFull = !isCutoff && availableWidth >= nameWidth;
  const canFitShort = !isCutoff && !canFitFull && task.shortName && availableWidth >= shortNameWidth;
  
  const labelInside = canFitFull ? task.name : (canFitShort ? task.shortName : null);
  
  // Floating label logic:
  // - Always for cutoffs
  // - When hovered AND the full name is NOT visible inside
  const showFloating = isHovered && (isCutoff || !canFitFull);

  return (
    <div className="w-full h-full flex items-center justify-center relative px-1">
      {labelInside && (
        <span className="text-[11px] font-bold text-white truncate w-full text-center drop-shadow-md select-none leading-none">
          {labelInside}
        </span>
      )}
      
      <AnimatePresence>
        {showFloating && (
          <motion.div
            initial={{ opacity: 0, y: 8, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.95 }}
            className="absolute left-1/2 -top-12 z-[100] pointer-events-none"
          >
            <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[12px] font-bold px-3 py-2 rounded-lg border border-slate-700 shadow-2xl whitespace-nowrap flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 border-r border-slate-700 pr-2 mr-0.5">
                {task.isCashConfirmed && <DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                {task.requiresWorkingHours && <Clock className="w-3.5 h-3.5 text-sky-400" />}
                <span className="text-[10px] text-slate-400 font-mono">{task.startTime}</span>
              </div>
              <span>{task.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}