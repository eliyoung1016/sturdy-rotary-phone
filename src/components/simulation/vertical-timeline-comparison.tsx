"use client";

import { Calendar, Clock, TrendingDown } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Task {
  tempId?: string;
  id?: number;
  name: string;
  dayOffset: number;
  startTime: string;
  duration: number;
  type?: "PROCESS" | "CUTOFF";
  color?: string;
}

interface VerticalTimelineComparisonProps {
  currentTasks: Task[];
  targetTasks: Task[];
  fundName: string;
  officeStart?: string;
  officeEnd?: string;
}

interface TimelineEvent {
  time: Date;
  label: string;
  task: Task;
  practice: "current" | "target";
  isStart: boolean;
}

export function VerticalTimelineComparison({
  currentTasks,
  targetTasks,
  fundName,
  officeStart = "09:00",
  officeEnd = "18:00",
}: VerticalTimelineComparisonProps) {
  const timelineData = useMemo(() => {
    const events: TimelineEvent[] = [];
    const baseDate = new Date(2026, 0, 1); // January 1, 2026 as baseline

    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return { hours, minutes };
    };

    const addTaskEvents = (tasks: Task[], practice: "current" | "target") => {
      tasks.forEach((task) => {
        const { hours, minutes } = parseTime(task.startTime);
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + task.dayOffset);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + task.duration);

        events.push({
          time: startDate,
          label: `${task.name} (Start)`,
          task,
          practice,
          isStart: true,
        });

        events.push({
          time: endDate,
          label: `${task.name} (End)`,
          task,
          practice,
          isStart: false,
        });
      });
    };

    addTaskEvents(currentTasks, "current");
    addTaskEvents(targetTasks, "target");

    // Sort by time
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    return events;
  }, [currentTasks, targetTasks]);

  const metrics = useMemo(() => {
    const calculateTotalTime = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;

      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return { hours, minutes };
      };

      const baseDate = new Date(2026, 0, 1);

      const startValidParams = tasks.map((task) => {
        const { hours, minutes } = parseTime(task.startTime);
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + task.dayOffset);
        startDate.setHours(hours, minutes, 0, 0);
        return startDate.getTime();
      });

      const endValidParams = tasks.map((task) => {
        const { hours, minutes } = parseTime(task.startTime);
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + task.dayOffset);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + task.duration);
        return endDate.getTime();
      });

      if (startValidParams.length === 0) return 0;

      const minStart = Math.min(...startValidParams);
      const maxEnd = Math.max(...endValidParams);

      return (maxEnd - minStart) / (1000 * 60); // minutes
    };

    const currentTotalMinutes = calculateTotalTime(currentTasks);
    const targetTotalMinutes = calculateTotalTime(targetTasks);
    const timeSavedMinutes = currentTotalMinutes - targetTotalMinutes;
    const timeSavedHours = Math.round((timeSavedMinutes / 60) * 10) / 10;

    const currentTasksTotal = currentTasks.reduce(
      (sum, t) => sum + t.duration,
      0,
    );
    const targetTasksTotal = targetTasks.reduce(
      (sum, t) => sum + t.duration,
      0,
    );
    const taskDurationSaved = currentTasksTotal - targetTasksTotal;

    return {
      currentTotalMinutes,
      targetTotalMinutes,
      timeSavedMinutes,
      timeSavedHours,
      currentTasksTotal,
      targetTasksTotal,
      taskDurationSaved,
      percentageSaved:
        currentTotalMinutes > 0
          ? Math.round((timeSavedMinutes / currentTotalMinutes) * 100)
          : 0,
    };
  }, [currentTasks, targetTasks]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getDayLabel = (dayOffset: number) => {
    if (dayOffset === 0) return "Day 0 (D-Day)";
    if (dayOffset < 0) return `Day ${dayOffset} (D${dayOffset})`;
    return `Day +${dayOffset} (D+${dayOffset})`;
  };

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<
      number,
      { current: TimelineEvent[]; target: TimelineEvent[] }
    >();

    timelineData.forEach((event) => {
      const dayOffset = event.task.dayOffset;
      if (!grouped.has(dayOffset)) {
        grouped.set(dayOffset, { current: [], target: [] });
      }
      grouped.get(dayOffset)![event.practice].push(event);
    });

    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [timelineData]);

  return (
    <div className="space-y-6">
      {/* Header with Fund Name */}
      <div className="text-center">
        <h2 className="text-3xl font-bold">{fundName}</h2>
        <p className="text-muted-foreground">Comparison Timeline</p>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Current Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.currentTotalMinutes / 60) * 10) / 10}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total workflow duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Target Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.targetTotalMinutes / 60) * 10) / 10}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total workflow duration
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <TrendingDown className="h-4 w-4" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {metrics.timeSavedHours}h
            </div>
            <p className="text-xs text-green-600">
              {metrics.percentageSaved}% improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Timeline - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Practice Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />

              <div className="space-y-6">
                {eventsByDay.map(([dayOffset, events]) => (
                  <div key={`current-day-${dayOffset}`} className="relative">
                    {/* Day marker */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-16 h-16 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-blue-700">
                          {getDayLabel(dayOffset).split(" ")[1]}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-700">
                        {getDayLabel(dayOffset)}
                      </div>
                    </div>

                    {/* Current tasks for this day */}
                    <div className="ml-24 space-y-2">
                      {events.current
                        .filter((e) => e.isStart)
                        .map((event, idx) => (
                          <div
                            key={`current-${dayOffset}-${idx}`}
                            className="p-3 rounded-lg bg-blue-50 border border-blue-200"
                          >
                            <div className="font-medium text-sm">
                              {event.task.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatTime(event.time)} ({event.task.duration}{" "}
                              min)
                            </div>
                            {event.task.type && (
                              <div className="text-xs text-gray-500 mt-1">
                                Type: {event.task.type}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Practice Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Target Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />

              <div className="space-y-6">
                {eventsByDay.map(([dayOffset, events]) => (
                  <div key={`target-day-${dayOffset}`} className="relative">
                    {/* Day marker */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-green-700">
                          {getDayLabel(dayOffset).split(" ")[1]}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-700">
                        {getDayLabel(dayOffset)}
                      </div>
                    </div>

                    {/* Target tasks for this day */}
                    <div className="ml-24 space-y-2">
                      {events.target
                        .filter((e) => e.isStart)
                        .map((event, idx) => (
                          <div
                            key={`target-${dayOffset}-${idx}`}
                            className="p-3 rounded-lg bg-green-50 border border-green-200"
                          >
                            <div className="font-medium text-sm">
                              {event.task.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatTime(event.time)} ({event.task.duration}{" "}
                              min)
                            </div>
                            {event.task.type && (
                              <div className="text-xs text-gray-500 mt-1">
                                Type: {event.task.type}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Summary */}
      <Card className="border-2 border-green-500">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            Summary: Total Time Saved
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <div className="text-5xl font-bold text-green-600">
              {metrics.timeSavedHours} hours
            </div>
            <div className="text-lg text-muted-foreground mt-2">
              ({metrics.timeSavedMinutes} minutes)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">
                Current Duration
              </div>
              <div className="text-2xl font-semibold">
                {Math.round((metrics.currentTotalMinutes / 60) * 10) / 10}h
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Target Duration
              </div>
              <div className="text-2xl font-semibold">
                {Math.round((metrics.targetTotalMinutes / 60) * 10) / 10}h
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Improvement</div>
              <div className="text-2xl font-semibold text-green-600">
                {metrics.percentageSaved}%
              </div>
            </div>
          </div>

          <div className="pt-4 text-sm text-muted-foreground">
            By optimizing your workflow from current to target practice, you can
            save significant time and improve operational efficiency.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
