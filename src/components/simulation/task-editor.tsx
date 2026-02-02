"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColorSelect } from "@/components/ui/color-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="border rounded-md bg-white shadow-sm overflow-hidden">
      {/* Header Row */}
      <div className="grid grid-cols-[1.5fr_100px_320px_90px_40px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
        <div className="pl-1">Task Name</div>
        <div>Type</div>
        <div>Timing (Offset / Start / Dur)</div>
        <div>Color</div>
        <div className="text-right"></div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {tasks.map((task, index) => (
          <div
            key={task.tempId || index}
            className="grid grid-cols-[1.5fr_100px_320px_90px_40px] gap-2 items-center border-b last:border-0 py-2 px-3 hover:bg-muted/20 transition-colors"
          >
            {/* Task Name */}
            <div>
              <Input
                value={task.name}
                onChange={(e) => onUpdate(index, "name", e.target.value)}
                disabled={readOnly}
                className="h-7 text-xs"
              />
            </div>

            {/* Type */}
            <div>
              <Select
                value={task.type || "PROCESS"}
                onValueChange={(val) => {
                  const newType = val as "PROCESS" | "CUTOFF";
                  onUpdate(index, "type", newType);
                  if (newType === "CUTOFF") {
                    onUpdate(index, "duration", 0);
                  }
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROCESS">Process</SelectItem>
                  <SelectItem value="CUTOFF">Cutoff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-3 gap-1">
              <Select
                value={task.dayOffset.toString()}
                onValueChange={(val) =>
                  onUpdate(index, "dayOffset", Number(val))
                }
                disabled={readOnly}
              >
                <SelectTrigger className="h-7 text-xs px-1">
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
              <Input
                type="time"
                value={task.startTime}
                onChange={(e) => onUpdate(index, "startTime", e.target.value)}
                disabled={readOnly}
                className="h-7 text-xs px-1"
              />
              <Input
                type="number"
                value={task.duration}
                onChange={(e) =>
                  onUpdate(index, "duration", Number(e.target.value))
                }
                disabled={readOnly || task.type === "CUTOFF"}
                className="h-7 text-xs px-1"
              />
            </div>

            {/* Color */}
            <div className="h-7">
              <ColorSelect
                value={task.color}
                onValueChange={(val) => onUpdate(index, "color", val)}
                disabled={readOnly}
              />
            </div>

            {/* Actions */}
            <div className="text-right">
              {!readOnly && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => onDelete(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
