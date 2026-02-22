import { motion } from "framer-motion";
import React, { memo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/simulation";

export interface DragLabelState {
    show: boolean;
    x: number;
    y: number;
    dayOffset: number;
    time: string;
}

export const GanttTaskBar = memo(
    function GanttTaskBar({
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
        task: TaskItem;
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
        const [isResizing, setIsResizing] = useState(false);
        const isResizingRef = useRef(false);

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
                            const deltaPixels = info.offset.x;
                            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
                            const newStartMins = startMins + deltaMinutes;
                            const snappedMins = Math.round(newStartMins / 15) * 15;
                            const { dayOffset, startTime } =
                                getDayAndTimeFromMinutes(snappedMins);

                            const containerRect =
                                containerRef.current?.getBoundingClientRect();
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
                            const snappedMins = Math.round(newStartMins / 15) * 15;
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
                            "absolute top-0 h-8 rounded-md flex items-center px-2 text-xs font-semibold text-white cursor-grab active:cursor-grabbing overflow-visible",
                            !readOnly
                                ? !task.color && "bg-primary hover:bg-primary/90"
                                : "bg-muted-foreground",
                        )}
                        style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 0.5)}%`,
                            backgroundColor: !readOnly && task.color ? colorStyle : undefined,
                        }}
                        drag={readOnly || isResizing || isResizingRef.current ? false : "x"}
                        dragMomentum={false}
                        dragElastic={0}
                        onDrag={(e, info) => {
                            if (readOnly || isResizing || isResizingRef.current) return;
                            const deltaPixels = info.offset.x;
                            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
                            const newStartMins = startMins + deltaMinutes;
                            const snappedMins = Math.round(newStartMins / 15) * 15;
                            const { dayOffset, startTime } =
                                getDayAndTimeFromMinutes(snappedMins);

                            const containerRect =
                                containerRef.current?.getBoundingClientRect();
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
                            if (readOnly || isResizing || isResizingRef.current) return;
                            setDragLabel((prev) => ({ ...prev, show: false }));
                            const deltaPixels = info.offset.x;
                            const deltaMinutes = (deltaPixels / chartWidth) * totalMinutes;
                            const newStartMins = startMins + deltaMinutes;
                            const snappedMins = Math.round(newStartMins / 15) * 15;
                            const { dayOffset, startTime } =
                                getDayAndTimeFromMinutes(snappedMins);

                            onTaskUpdate(task.tempId, dayOffset, startTime, task.duration);
                        }}
                    >
                        {(() => {
                            const availableWidth = (widthPercent / 100) * chartWidth;
                            const charWidth = 7; // Estimate for text-xs font-semibold
                            const padding = 16; // 8px each side
                            const fullNameWidth = task.name.length * charWidth + padding;

                            // 1. If full name fits, show it inside
                            if (availableWidth >= fullNameWidth) {
                                return <span className="truncate w-full">{task.name}</span>;
                            }

                            // 2. If task has a short name and it fits, show it inside
                            if (task.shortName) {
                                const shortNameWidth = task.shortName.length * charWidth + padding;
                                if (availableWidth >= shortNameWidth) {
                                    return <span className="truncate w-full">{task.shortName}</span>;
                                }
                            }

                            // 3. Otherwise (no short name, or neither fits), show full name outside
                            return (
                                <span
                                    className="absolute left-full ml-2 text-primary font-bold whitespace-nowrap drop-shadow-sm"
                                    style={{ color: !readOnly && task.color ? colorStyle : undefined }}
                                >
                                    {task.name}
                                </span>
                            );
                        })()}

                        {!readOnly && (
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 active:bg-white/40"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsResizing(true); // Set resizing to true
                                    isResizingRef.current = true;
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
                                        const newDurationRaw =
                                            (newWidthPercent / 100) * totalMinutes;
                                        const newDuration = Math.round(newDurationRaw / 15) * 15;

                                        localDurationRef.current = newDuration;
                                        setLocalDuration(newDuration);
                                    };

                                    const onUp = () => {
                                        window.removeEventListener("pointermove", onMove);
                                        window.removeEventListener("pointerup", onUp);

                                        // Add a tiny delay before allowing drag again to prevent misfiring onDragEnd
                                        setTimeout(() => {
                                            setIsResizing(false);
                                            isResizingRef.current = false;
                                        }, 50);

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
    },
    (prevProps, nextProps) => {
        if (
            prevProps.readOnly !== nextProps.readOnly ||
            prevProps.minMinutes !== nextProps.minMinutes ||
            prevProps.totalMinutes !== nextProps.totalMinutes ||
            prevProps.chartWidth !== nextProps.chartWidth
        ) {
            return false;
        }

        const t1 = prevProps.task;
        const t2 = nextProps.task;

        return (
            t1.tempId === t2.tempId &&
            t1.dayOffset === t2.dayOffset &&
            t1.startTime === t2.startTime &&
            t1.duration === t2.duration &&
            t1.name === t2.name &&
            t1.color === t2.color
        );
    },
);
