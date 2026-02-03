"use client";

import { Clock, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ComparisonSummaryProps {
  currentTotalMinutes: number;
  targetTotalMinutes: number;
}

export function ComparisonSummary({
  currentTotalMinutes,
  targetTotalMinutes,
}: ComparisonSummaryProps) {
  const metrics = useMemo(() => {
    const timeSavedMinutes = currentTotalMinutes - targetTotalMinutes;
    return {
      timeSavedMinutes,
      timeSavedHours: Math.round((timeSavedMinutes / 60) * 10) / 10,
      percentageSaved:
        currentTotalMinutes > 0
          ? Math.round((timeSavedMinutes / currentTotalMinutes) * 100)
          : 0,
    };
  }, [currentTotalMinutes, targetTotalMinutes]);

  return (
    <div className="flex justify-center gap-4">
      {/* Current Metric */}
      <Card className="shadow-none border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Current Duration
            </p>
            <div className="text-2xl font-bold text-blue-900">
              {Math.round(currentTotalMinutes / 60)}h{" "}
              <span className="text-base font-normal text-muted-foreground">
                {currentTotalMinutes % 60}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Metric */}
      <Card className="shadow-none border-green-200 bg-green-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full text-green-600">
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Target Duration
            </p>
            <div className="text-2xl font-bold text-green-900">
              {Math.round(targetTotalMinutes / 60)}h{" "}
              <span className="text-base font-normal text-muted-foreground">
                {targetTotalMinutes % 60}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Metric */}
      <Card className="shadow-none border-purple-200 bg-purple-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-full text-purple-600">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Time Saved
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900">
                {metrics.timeSavedHours}h
              </span>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700 hover:bg-purple-100"
              >
                -{metrics.percentageSaved}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
