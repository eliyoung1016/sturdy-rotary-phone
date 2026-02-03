"use client";

import { Clock, DollarSign, TrendingDown } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { ComparisonSummary } from "@/components/simulation/comparison-summary";
import { TASK_COLORS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";

interface Task {
  tempId?: string;
  id?: number;
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
  timeSavedHours: number;
  percentageSaved: number;
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
  // 1. Calculate Metrics
  const metrics: ComparisonMetrics = useMemo(() => {
    const calcDuration = (tasks: Task[]) => {
      if (!tasks.length) return 0;
      // Simple approximation: sum durations.
      // Ideally we'd find min start and max end, but strictly summing durations
      // is often what users want to see "active work time" vs "span".
      // Let's stick to span (max end - min start) as in previous logic for "Total workflow duration"
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
    // ... other metrics not needed for render anymore, but needed for component logic if used elsewhere.
    // Actually, we process metrics here. Let's just calculate raw values used by the new component.

    // We can simplify this hook to just calculate the two totals.
    return {
      currentTotalMinutes,
      targetTotalMinutes,
      timeSavedMinutes: currentTotalMinutes - targetTotalMinutes,
      timeSavedHours: 0, // Ignored by new component
      percentageSaved: 0, // Ignored by new component
    };
  }, [currentTasks, targetTasks]);

  // 2. Prepare Data Structure for Center Spine Layout
  const timelineData = useMemo(() => {
    // Collect all unique day offsets
    const allDays = new Set<number>();
    [...currentTasks, ...targetTasks].forEach((t) => allDays.add(t.dayOffset));
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);

    const groups: DayGroup[] = sortedDays.map((dayOffset) => {
      // Find all unique start times for this day
      const timesSet = new Set<string>();
      [...currentTasks, ...targetTasks]
        .filter((t) => t.dayOffset === dayOffset)
        .forEach((t) => timesSet.add(t.startTime));

      const sortedTimes = Array.from(timesSet).sort();

      const timeSlots: TimeSlot[] = sortedTimes.map((timeStr) => {
        // Create a date object just for parsing convenience if needed, or just use string
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

    return groups;
  }, [currentTasks, targetTasks]);

  const getDayLabel = (offset: number) => {
    if (offset === 0) return "Day 0 (D-Day)";
    if (offset > 0) return `Day +${offset}`;
    return `Day ${offset}`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header & Metrics */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-muted-foreground mb-2">
            Comparison Mode
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">{fundName}</h2>
          <p className="text-muted-foreground"> Current vs. Target Process</p>
        </div>

        {/* Unified Summary Component */}
        <ComparisonSummary
          currentTotalMinutes={metrics.currentTotalMinutes}
          targetTotalMinutes={metrics.targetTotalMinutes}
        />
      </div>
      {/* Center Spine Timeline */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden md:block" />

        {/* Column Headers */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 mb-8 sticky top-0 bg-background z-20 py-4 border-b">
          <div className="hidden md:flex justify-end px-4 items-center gap-2">
            <h3 className="text-lg font-semibold text-blue-700">
              Current Practice
            </h3>
          </div>
          <div className="w-16 md:w-auto" /> {/* Spacer for spine */}
          <div className="hidden md:flex justify-start px-4 items-center gap-2">
            <h3 className="text-lg font-semibold text-green-700">
              Target Practice
            </h3>
          </div>
        </div>

        <div className="space-y-12">
          {timelineData.map((day) => (
            <div key={day.dayOffset} className="space-y-6">
              {/* Day Header */}
              <div className="flex justify-center relative z-10">
                <Badge
                  variant="secondary"
                  className="px-4 py-1 text-sm font-semibold bg-background border shadow-sm"
                >
                  {getDayLabel(day.dayOffset)}
                </Badge>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                {day.timeSlots.map((slot) => (
                  <div
                    key={`${day.dayOffset}-${slot.timeStr}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-start group"
                  >
                    {/* LEFT: Current Tasks */}
                    <div className="flex flex-col items-end space-y-2 md:text-right order-2 md:order-1 px-4 md:px-0">
                      {slot.currentTasks.length > 0 ? (
                        slot.currentTasks.map((task, idx) => (
                          <TaskCard key={idx} task={task} />
                        ))
                      ) : (
                        <div className="h-full" /> /* Spacer */
                      )}
                    </div>

                    {/* CENTER: Time Spine */}
                    <div className="flex items-center justify-center order-1 md:order-2 py-2 sticky top-20 bg-background/80 backdrop-blur-sm z-10 md:static md:bg-transparent">
                      <div className="flex items-center justify-center w-16 md:w-auto">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-muted-foreground bg-background"
                        >
                          {slot.timeStr}
                        </Badge>
                      </div>
                    </div>

                    {/* RIGHT: Target Tasks */}
                    <div className="flex flex-col items-start space-y-2 order-3 px-4 md:px-0">
                      {slot.targetTasks.length > 0 ? (
                        slot.targetTasks.map((task, idx) => (
                          <TaskCard key={idx} task={task} />
                        ))
                      ) : (
                        <div className="h-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {timelineData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tasks found for comparison.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const taskColorObj = TASK_COLORS.find((c) => c.value === task.color);
  const colorVar = taskColorObj?.color || "var(--primary)";

  // We'll use inline styles to leverage the CSS variable for background opacity
  const style = {
    backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 85%)`,
    borderColor: `color-mix(in srgb, ${colorVar}, transparent 50%)`,
    // If we want a solid colored left border like a "tag"
    borderLeftWidth: "4px",
    borderLeftColor: colorVar,
  };

  return (
    <div
      className={cn(
        "rounded-r-lg rounded-l-sm border-t border-r border-b px-3 py-2 w-full max-w-[300px] shadow-sm transition-all hover:shadow-md relative",
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 max-w-[80%]">
          <span className="text-xs font-semibold leading-tight text-foreground">
            {task.name}
          </span>
        </div>
        <span className="text-[10px] font-mono shrink-0 text-muted-foreground">
          {task.duration}m
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {task.type && (
          <div className="text-[10px] uppercase text-muted-foreground">
            {task.type}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {task.isCashConfirmed && (
            <div
              title="Cash Confirmed"
              className="bg-green-100 rounded-full p-0.5"
            >
              <DollarSign className="w-3 h-3 text-green-700" />
            </div>
          )}
          {task.requiresWorkingHours && (
            <div
              title="Requires Working Hours"
              className="bg-blue-100 rounded-full p-0.5"
            >
              <Clock className="w-3 h-3 text-blue-700" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
