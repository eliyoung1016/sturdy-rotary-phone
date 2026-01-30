"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Task {
  tempId: string;
  name: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  type?: "PROCESS" | "CUTOFF";
  color?: string;
}

interface TaskEditorProps {
  tasks: Task[];
  onUpdate: (index: number, field: keyof Task, value: any) => void;
  onDelete?: (index: number) => void;
  readOnly?: boolean;
}

export function TaskEditor({
  tasks,
  onUpdate,
  onDelete,
  readOnly = false,
}: TaskEditorProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No tasks available for this view.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <Card
          key={task.tempId || index}
          className={`relative ${
            task.type === "CUTOFF"
              ? "border-destructive/50 bg-destructive/5"
              : ""
          }`}
        >
          {!readOnly && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
              onClick={() => onDelete(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
            {/* Task Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Name</Label>
                <Input
                  value={task.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select
                  value={task.type || "PROCESS"}
                  onValueChange={(val) => {
                    const newType = val as "PROCESS" | "CUTOFF";
                    onUpdate(index, "type", newType);
                    // If changing to CUTOFF, set duration to 0
                    if (newType === "CUTOFF") {
                      onUpdate(index, "duration", 0);
                    }
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROCESS">Process</SelectItem>
                    <SelectItem value="CUTOFF">Cutoff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={task.color || "primary"}
                  onValueChange={(val) => onUpdate(index, "color", val)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="destructive">Destructive</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="spot-tuquoise-1">Turquoise 1</SelectItem>
                    <SelectItem value="spot-tuquoise-2">Turquoise 2</SelectItem>
                    <SelectItem value="spot-tuquoise-3">Turquoise 3</SelectItem>
                    <SelectItem value="spot-blue-1">Blue 1</SelectItem>
                    <SelectItem value="spot-blue-2">Blue 2</SelectItem>
                    <SelectItem value="spot-blue-3">Blue 3</SelectItem>
                    <SelectItem value="spot-orange-1">Orange 1</SelectItem>
                    <SelectItem value="spot-orange-2">Orange 2</SelectItem>
                    <SelectItem value="spot-orange-3">Orange 3</SelectItem>
                    <SelectItem value="spot-yellow">Yellow</SelectItem>
                    <SelectItem value="spot-green-1">Green 1</SelectItem>
                    <SelectItem value="spot-green-2">Green 2</SelectItem>
                    <SelectItem value="spot-mauve-1">Mauve 1</SelectItem>
                    <SelectItem value="spot-mauve-2">Mauve 2</SelectItem>
                    <SelectItem value="spot-mauve-3">Mauve 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4 grid grid-cols-3 gap-4">
              {/* Day Offset */}
              <div className="space-y-2">
                <Label>Day</Label>
                <Select
                  value={task.dayOffset.toString()}
                  onValueChange={(val) =>
                    onUpdate(index, "dayOffset", Number(val))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-2">D-2</SelectItem>
                    <SelectItem value="-1">D-1</SelectItem>
                    <SelectItem value="0">D</SelectItem>
                    <SelectItem value="1">D+1</SelectItem>
                    <SelectItem value="2">D+2</SelectItem>
                    <SelectItem value="3">D+3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={task.startTime}
                  onChange={(e) => onUpdate(index, "startTime", e.target.value)}
                  disabled={readOnly}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (m)</Label>
                <Input
                  type="number"
                  value={task.duration}
                  onChange={(e) =>
                    onUpdate(index, "duration", Number(e.target.value))
                  }
                  disabled={readOnly || task.type === "CUTOFF"}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
