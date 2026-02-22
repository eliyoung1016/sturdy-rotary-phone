"use client";

import { motion } from "framer-motion";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { TaskItem } from "@/types/simulation";
import type { DragLabelState } from "./gantt/gantt-task-bar";

interface GanttChartProps {
  tasks: TaskItem[];
  onTaskUpdate: (
    tempId: string,
    newDayOffset: number,
    newStartTime: string,
    newDuration: number,
  ) => void;
  readOnly?: boolean;
  officeStart?: string; // "HH:mm" format
  officeEnd?: string; // "HH:mm" format
  overrideMinMinutes?: number;
  overrideMaxMinutes?: number;
}

const HOUR_WIDTH = 40; // px
const DAY_WIDTH = HOUR_WIDTH * 24;

const START_HOUR = 0; // 00:00
import { GanttGrid } from "./gantt/gantt-grid";
import { GanttTaskBar } from "./gantt/gantt-task-bar";

export function GanttChart({
  tasks,
  onTaskUpdate,
  readOnly = false,
  officeStart = "09:00",
  officeEnd = "17:00",
  overrideMinMinutes,
  overrideMaxMinutes,
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
    // If overrides are provided, use them directly
    if (overrideMinMinutes !== undefined && overrideMaxMinutes !== undefined) {
      return {
        minMinutes: overrideMinMinutes,
        maxMinutes: overrideMaxMinutes,
        sortedTasks: tasks,
      };
    }

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

    // Add some padding if calculating automatically
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
  }, [tasks, getAbsoluteMinutes, overrideMinMinutes, overrideMaxMinutes]);

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
                key={`${task.tempId}-${task.dayOffset}-${task.startTime}-${task.duration}`}
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
