import React, { memo } from "react";

const HOUR_WIDTH = 40; // px
const DAY_WIDTH = HOUR_WIDTH * 24;

export const GanttGrid = memo(function GanttGrid({
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
                        <div className="flex-1 bg-spot-orange-1/15 text-[10px] text-spot-orange-1 flex items-center justify-center border-r font-medium border-orange-200">
                            Asia
                        </div>
                        <div className="flex-1 bg-spot-blue-1/15 text-[10px] text-spot-blue-1 flex items-center justify-center border-r font-medium border-blue-200">
                            EU
                        </div>
                        <div className="flex-1 bg-spot-green-1/15 text-[10px] text-spot-green-1 flex items-center justify-center border-r font-medium border-green-200">
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
                {days.map((day) => {
                    // Calculate exact positions for the day block
                    const dayStartMins = day * 24 * 60;
                    const dayLeftPercent = minutesToPercent(dayStartMins);
                    const dayWidthPercent = minutesToPercentWidth(24 * 60);

                    return (
                        <div
                            key={day}
                            className="absolute top-0 bottom-0 border-r border-border/30"
                            style={{
                                left: `${dayLeftPercent}%`,
                                width: `${dayWidthPercent}%`,
                                backgroundImage:
                                    "linear-gradient(to right, transparent 0%, transparent calc(100% / 24 - 1px), rgba(0,0,0,0.05) calc(100% / 24 - 1px), rgba(0,0,0,0.05) calc(100% / 24))",
                                backgroundSize: `calc(100% / 24) 100%`,
                            }}
                        />
                    );
                })}
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
