"use client";

import { motion } from "framer-motion";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface DragLabelState {
  show: boolean;
  x: number;
  y: number;
  dayOffset: number;
  time: string;
}

interface Task {
  tempId: string;
  name: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  color?: string;
}

interface GanttChartProps {
  tasks: Task[];
  onTaskUpdate: (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => void;
  readOnly?: boolean;
  officeStart?: string; // "HH:mm" format
  officeEnd?: string; // "HH:mm" format
}

const HOUR_WIDTH = 40; // px
const DAY_WIDTH = HOUR_WIDTH * 24;
const START_HOUR = 0; // 00:00
const HOURS_PER_DAY = 24;

const GanttGrid = memo(function GanttGrid({
  days,
  officeStart,
  officeEnd,
  minMinutes,
  totalMinutes,
}: {
  days: number[];
  officeStart: string;
  officeEnd: string;
  minMinutes: number;
  totalMinutes: number;
}) {
  const getAbsoluteMinutes = (dayOffset: number, timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return dayOffset * 24 * 60 + hours * 60 + minutes;
  };

  const minutesToPercent = (mins: number) => {
    return ((mins - minMinutes) / totalMinutes) * 100;
  };

  const minutesToPercentWidth = (mins: number) => {
    return (mins / totalMinutes) * 100;
  };

  return (
    <>
      <div className="flex border-b h-6 bg-background relative z-30">
        {days.map((day) => (
          <div key={day} className="flex" style={{ minWidth: DAY_WIDTH }}>
            <div className="flex-1 bg-orange-100/50 text-[10px] text-orange-800 flex items-center justify-center border-r font-medium border-orange-200">
              Asia
            </div>
            <div className="flex-1 bg-blue-100/50 text-[10px] text-blue-800 flex items-center justify-center border-r font-medium border-blue-200">
              CET
            </div>
            <div className="flex-1 bg-green-100/50 text-[10px] text-green-800 flex items-center justify-center border-r font-medium border-green-200">
              NA
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-b h-10 sticky top-0 bg-background z-20">
        {days.map((day) => (
          <div
            key={day}
            className="border-r text-xs font-medium text-muted-foreground flex items-center justify-center bg-muted/20 flex-1"
            style={{ minWidth: DAY_WIDTH }}
          >
            Day {day >= 0 ? `D+${day}` : `D${day}`}
          </div>
        ))}
      </div>

      <div className="flex border-b h-8 sticky top-10 bg-background z-10">
        {days.map((day) =>
          Array.from({ length: 24 }).map((_, hour) => (
            <div
              key={`${day}-${hour}`}
              className="border-r text-[10px] text-muted-foreground flex items-center justify-center font-mono flex-1"
              style={{ minWidth: HOUR_WIDTH }}
            >
              {hour.toString().padStart(2, "0")}:00
            </div>
          )),
        )}
      </div>

      <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
        {days.map((day) =>
          Array.from({ length: 24 }).map((_, h) => {
            const hourStartMins = day * 24 * 60 + h * 60; // Simplified calculation if getAbsoluteMinutes is consistent
            const leftPercent = minutesToPercent(hourStartMins);
            const widthPercent = minutesToPercentWidth(60);

            return (
              <div
                key={`${day}-${h}`}
                className="absolute top-0 bottom-0 border-r border-border/30"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
              />
            );
          }),
        )}
      </div>

      <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
        {days.map((day) => {
          const officeStartMins = getAbsoluteMinutes(day, officeStart);
          const officeEndMins = getAbsoluteMinutes(day, officeEnd);
          const officeLeftPercent = minutesToPercent(officeStartMins);
          const officeWidthPercent = minutesToPercentWidth(
            officeEndMins - officeStartMins,
          );

          const beforeOfficeStart = getAbsoluteMinutes(day, "00:00");
          const beforeOfficeLeftPercent = minutesToPercent(beforeOfficeStart);
          const beforeOfficeWidthPercent = minutesToPercentWidth(
            officeStartMins - beforeOfficeStart,
          );

          const afterOfficeEnd = getAbsoluteMinutes(day + 1, "00:00");
          const afterOfficeLeftPercent = minutesToPercent(officeEndMins);
          const afterOfficeWidthPercent = minutesToPercentWidth(
            afterOfficeEnd - officeEndMins,
          );

          return (
            <React.Fragment key={`zones-${day}`}>
              <div
                className="absolute top-0 bottom-0 bg-red-500/15"
                style={{
                  left: `${beforeOfficeLeftPercent}%`,
                  width: `${beforeOfficeWidthPercent}%`,
                }}
              />
              <div
                className="absolute top-0 bottom-0 bg-green-500/15"
                style={{
                  left: `${officeLeftPercent}%`,
                  width: `${officeWidthPercent}%`,
                }}
              />
              <div
                className="absolute top-0 bottom-0 bg-red-500/15"
                style={{
                  left: `${afterOfficeLeftPercent}%`,
                  width: `${afterOfficeWidthPercent}%`,
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
});

const GanttTaskBar = memo(function GanttTaskBar({
  task,
  readOnly,
  minMinutes,
  totalMinutes,
  chartWidth,
  containerRef,
  onTaskUpdate,
  setDragLabel,
  getAbsoluteMinutes,
  getDayAndTimeFromMinutes,
  minutesToPercent,
  minutesToPercentWidth,
}: {
  task: Task;
  readOnly: boolean;
  minMinutes: number;
  totalMinutes: number;
  chartWidth: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTaskUpdate: (
    tempId: string,
    dayOffset: number,
    startTime: string,
    duration: number,
  ) => void;
  setDragLabel: React.Dispatch<React.SetStateAction<DragLabelState>>;
  getAbsoluteMinutes: (dayOffset: number, timeStr: string) => number;
  getDayAndTimeFromMinutes: (mins: number) => {
    dayOffset: number;
    startTime: string;
  };
  minutesToPercent: (mins: number) => number;
  minutesToPercentWidth: (mins: number) => number;
}) {
  // Local state for optimistic UI updates during resize
  const [localDuration, setLocalDuration] = useState<number | null>(null);
  const localDurationRef = useRef<number | null>(null);

  const startMins = getAbsoluteMinutes(task.dayOffset, task.startTime);
  const leftPercent = minutesToPercent(startMins);
  const duration = localDuration !== null ? localDuration : task.duration;
  const widthPercent = minutesToPercentWidth(duration);
  const isCutoff = task.duration === 0;
  const colorStyle = task.color ? `var(--color-${task.color})` : undefined;

  return (
    <div className="relative h-10 w-full group">
      {isCutoff ? (
        <motion.div
          className="absolute top-0 h-8 flex items-center cursor-grab active:cursor-grabbing pointer-events-auto z-10"
          style={{ left: `${leftPercent}%` }}
          drag={readOnly ? false : "x"}
          dragMomentum={false}
          dragElastic={0}
          onDrag={(e, info) => {
            if (readOnly) return;
            // chartWidth is static from prop, but might change on resize?
            // Assuming chartWidth is stable or updated via props
            const deltaPixels = info.offset.x;
            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
            const newStartMins = startMins + deltaMinutes;
            const snappedMins = Math.round(newStartMins / 5) * 5;
            const { dayOffset, startTime } =
              getDayAndTimeFromMinutes(snappedMins);

            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect && containerRef.current) {
              const scrollLeft = containerRef.current.scrollLeft;
              const linePositionPercent = minutesToPercent(newStartMins);
              const linePosition = (linePositionPercent / 100) * chartWidth;
              const labelX = containerRect.left + linePosition - scrollLeft;
              const labelY = containerRect.top - 50;

              setDragLabel({
                show: true,
                x: labelX,
                y: labelY,
                dayOffset,
                time: startTime,
              });
            }
          }}
          onDragEnd={(e, info) => {
            if (readOnly) return;
            setDragLabel((prev) => ({ ...prev, show: false }));
            const deltaPixels = info.offset.x;
            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
            const newStartMins = startMins + deltaMinutes;
            const snappedMins = Math.round(newStartMins / 5) * 5;
            const { dayOffset, startTime } =
              getDayAndTimeFromMinutes(snappedMins);

            onTaskUpdate(task.tempId, dayOffset, startTime, task.duration);
          }}
        >
          <span
            className={cn(
              "ml-2 text-sm font-bold whitespace-nowrap bg-background/80 px-2 py-0.5 rounded shadow-sm",
              !task.color && "text-primary",
            )}
            style={{ color: colorStyle }}
          >
            {task.name}
          </span>
        </motion.div>
      ) : (
        <motion.div
          className={cn(
            "absolute top-0 h-8 rounded-md flex items-center px-2 text-xs font-semibold text-white cursor-grab active:cursor-grabbing",
            !readOnly
              ? !task.color && "bg-primary hover:bg-primary/90"
              : "bg-muted-foreground",
          )}
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 0.5)}%`,
            backgroundColor: !readOnly && task.color ? colorStyle : undefined,
          }}
          drag={readOnly ? false : "x"}
          dragMomentum={false}
          dragElastic={0}
          onDrag={(e, info) => {
            if (readOnly) return;
            const deltaPixels = info.offset.x;
            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
            const newStartMins = startMins + deltaMinutes;
            const snappedMins = Math.round(newStartMins / 5) * 5;
            const { dayOffset, startTime } =
              getDayAndTimeFromMinutes(snappedMins);

            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect && containerRef.current) {
              const scrollLeft = containerRef.current.scrollLeft;
              const taskPositionPercent = minutesToPercent(newStartMins);
              const taskPosition = (taskPositionPercent / 100) * chartWidth;
              const taskWidthPixels = (widthPercent / 100) * chartWidth;
              const labelX =
                containerRect.left +
                taskPosition -
                scrollLeft +
                taskWidthPixels / 2;
              const labelY = containerRect.top - 50;

              setDragLabel({
                show: true,
                x: labelX,
                y: labelY,
                dayOffset,
                time: startTime,
              });
            }
          }}
          onDragEnd={(e, info) => {
            if (readOnly) return;
            setDragLabel((prev) => ({ ...prev, show: false }));
            const deltaPixels = info.offset.x;
            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
            const newStartMins = startMins + deltaMinutes;
            const snappedMins = Math.round(newStartMins / 5) * 5;
            const { dayOffset, startTime } =
              getDayAndTimeFromMinutes(snappedMins);

            onTaskUpdate(task.tempId, dayOffset, startTime, task.duration);
          }}
        >
          <span className="truncate w-full">{task.name}</span>

          {!readOnly && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 active:bg-white/40"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startWidthPercent = widthPercent;
                // Reset ref on start
                localDurationRef.current = null;

                const onMove = (moveEvent: PointerEvent) => {
                  const diffX = moveEvent.clientX - startX;
                  const diffPercent = (diffX / chartWidth) * 100;
                  const newWidthPercent = Math.max(
                    startWidthPercent + diffPercent,
                    0.5,
                  );
                  const newDurationRaw = (newWidthPercent / 100) * totalMinutes;
                  const newDuration = Math.round(newDurationRaw / 5) * 5;

                  localDurationRef.current = newDuration;
                  setLocalDuration(newDuration);
                };

                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);

                  const finalDuration = localDurationRef.current;
                  if (finalDuration !== null) {
                    onTaskUpdate(
                      task.tempId,
                      task.dayOffset,
                      task.startTime,
                      finalDuration,
                    );
                  }

                  localDurationRef.current = null;
                  setLocalDuration(null);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            />
          )}
        </motion.div>
      )}
    </div>
  );
});
export function GanttChart({
  tasks,
  onTaskUpdate,
  readOnly = false,
  officeStart = "09:00",
  officeEnd = "17:00",
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const [dragLabel, setDragLabel] = useState<DragLabelState>({
    show: false,
    x: 0,
    y: 0,
    dayOffset: 0,
    time: "00:00",
  });

  const getAbsoluteMinutes = useCallback(
    (dayOffset: number, timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return dayOffset * 24 * 60 + hours * 60 + minutes;
    },
    [],
  );

  const { minMinutes, maxMinutes, sortedTasks } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    tasks.forEach((t) => {
      const start = getAbsoluteMinutes(t.dayOffset, t.startTime);
      const end = start + t.duration;
      if (start < min) min = start;
      if (end > max) max = end;
    });

    if (min === Infinity) {
      min = 0;
      max = 24 * 60; // Default 1 day
    }

    // Add some padding
    min -= 120; // 2 hours padding
    max += 120; // 2 hours padding

    // Snap to day boundaries for nicer grid?
    const startDay = Math.floor(min / (24 * 60));
    const endDay = Math.ceil(max / (24 * 60));

    return {
      minMinutes: startDay * 24 * 60,
      maxMinutes: endDay * 24 * 60,
      sortedTasks: tasks,
    };
  }, [tasks, getAbsoluteMinutes]);

  const totalMinutes = maxMinutes - minMinutes;
  const totalDays = Math.ceil(totalMinutes / (24 * 60));

  // Calculate width: use either calculated width or fill available space (100%)
  const calculatedWidth = (totalMinutes / 60) * HOUR_WIDTH;

  // Generate day headers
  const days = useMemo(() => {
    const d = [];
    const startDay = Math.floor(minMinutes / (24 * 60));
    const endDay = Math.floor(maxMinutes / (24 * 60));

    for (let i = startDay; i < endDay; i++) {
      d.push(i);
    }
    return d;
  }, [minMinutes, maxMinutes]);

  // Calculation for idle time
  const idleBlocks = useMemo(() => {
    if (tasks.length < 2) return [];

    // Create a time-sorted copy for idle calculation
    const timeSorted = [...tasks].sort((a, b) => {
      return (
        getAbsoluteMinutes(a.dayOffset, a.startTime) -
        getAbsoluteMinutes(b.dayOffset, b.startTime)
      );
    });

    const blocks = [];
    for (let i = 0; i < timeSorted.length - 1; i++) {
      const currentTask = timeSorted[i];
      const nextTask = timeSorted[i + 1];

      const currentEnd =
        getAbsoluteMinutes(currentTask.dayOffset, currentTask.startTime) +
        currentTask.duration;
      const nextStart = getAbsoluteMinutes(
        nextTask.dayOffset,
        nextTask.startTime,
      );

      if (nextStart > currentEnd) {
        blocks.push({
          start: currentEnd,
          end: nextStart,
          duration: nextStart - currentEnd,
        });
      }
    }
    return blocks;
  }, [tasks, getAbsoluteMinutes]);

  const getDayAndTimeFromMinutes = useCallback((mins: number) => {
    const dayOffset = Math.floor(mins / (24 * 60));
    const remMins = Math.round(mins - dayOffset * 24 * 60);
    const hours = Math.floor(remMins / 60);
    const minutes = remMins % 60;
    return {
      dayOffset,
      startTime: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    };
  }, []);

  // Helper to convert minutes to percentage position
  const minutesToPercent = useCallback(
    (mins: number) => {
      return ((mins - minMinutes) / totalMinutes) * 100;
    },
    [minMinutes, totalMinutes],
  );

  // Helper to convert minutes duration to percentage width
  const minutesToPercentWidth = useCallback(
    (mins: number) => {
      return (mins / totalMinutes) * 100;
    },
    [totalMinutes],
  );

  return (
    <div className="border rounded-lg bg-background overflow-hidden flex flex-col">
      {/* Drag Time Label Overlay */}
      {dragLabel.show && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragLabel.x,
            top: dragLabel.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg text-sm font-semibold whitespace-nowrap">
            <div className="text-center">
              Day{" "}
              {dragLabel.dayOffset >= 0
                ? `D+${dragLabel.dayOffset}`
                : `D${dragLabel.dayOffset}`}
            </div>
            <div className="text-center text-base">{dragLabel.time}</div>
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div className="overflow-x-auto" ref={containerRef}>
        <div
          ref={chartContentRef}
          style={{ minWidth: calculatedWidth }}
          className="relative w-full"
        >
          <GanttGrid
            days={days}
            officeStart={officeStart}
            officeEnd={officeEnd}
            minMinutes={minMinutes}
            totalMinutes={totalMinutes}
          />

          {/* Cut-off Lines (Full Height) */}
          <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
            {sortedTasks
              .filter((task) => task.duration === 0)
              .map((task) => {
                const colorStyle = task.color
                  ? `var(--color-${task.color})`
                  : undefined;

                const startMins = getAbsoluteMinutes(
                  task.dayOffset,
                  task.startTime,
                );
                const leftPercent = minutesToPercent(startMins);

                return (
                  <div
                    key={`cutoff-line-${task.tempId}`}
                    className={cn(
                      "absolute top-0 bottom-0 border-l-2 border-dashed",
                      !task.color && "border-primary",
                    )}
                    style={{
                      left: `${leftPercent}%`,
                      borderColor: colorStyle,
                    }}
                  />
                );
              })}
          </div>

          {/* Tasks Rows */}
          <div className="py-4 space-y-4 relative min-h-50">
            {sortedTasks.map((task) => (
              <GanttTaskBar
                key={task.tempId}
                task={task}
                readOnly={readOnly}
                minMinutes={minMinutes}
                totalMinutes={totalMinutes}
                chartWidth={calculatedWidth}
                containerRef={containerRef}
                onTaskUpdate={onTaskUpdate}
                setDragLabel={setDragLabel}
                getAbsoluteMinutes={getAbsoluteMinutes}
                getDayAndTimeFromMinutes={getDayAndTimeFromMinutes}
                minutesToPercent={minutesToPercent}
                minutesToPercentWidth={minutesToPercentWidth}
              />
            ))}
          </div>

          {/* Idle Time Visualization */}
          <div className="mt-8 border-t pt-4 relative h-16">
            <div className="absolute left-0 top-0 bg-muted/30 h-full w-full pointer-events-none flex items-center pl-2">
              <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
                Idle Gaps
              </span>
            </div>
            {idleBlocks.map((block, idx) => {
              const leftPercent = minutesToPercent(block.start);
              const widthPercent = minutesToPercentWidth(block.duration);
              return (
                <div
                  key={idx}
                  className="absolute top-2 h-12 bg-gray-200/50 border border-dashed border-gray-400 rounded flex items-center justify-center text-[10px] text-gray-500"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                >
                  {Math.round(block.duration)}m
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Timeline: {totalDays} day(s) ({(totalMinutes / 60).toFixed(1)} hours)
        </div>
        <div className="text-sm font-medium">
          Total Idle Time: {idleBlocks.reduce((acc, b) => acc + b.duration, 0)}{" "}
          mins
        </div>
      </div>
    </div>
  );
}
