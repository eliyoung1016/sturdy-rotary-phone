"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/simulation";

interface DependencyPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  task: TaskItem | null;
  allTasks: TaskItem[];
  onUpdate: (updates: Partial<TaskItem>) => void;
}

export function DependencyPopover({
  isOpen,
  onClose,
  anchorEl,
  task,
  allTasks,
  onUpdate,
}: DependencyPopoverProps) {
  if (!task) return null;

  const getDependencyOptions = (currentTempId: string) => {
    return allTasks
      .map((f, idx) => ({
        label: f.name || `Task ${idx + 1}`,
        value: f.tempId,
        index: idx,
      }))
      .filter((f) => f.value !== currentTempId);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            top: anchorEl?.getBoundingClientRect().top ?? 0,
            left: anchorEl?.getBoundingClientRect().left ?? 0,
            width: anchorEl?.getBoundingClientRect().width ?? 0,
            height: anchorEl?.getBoundingClientRect().height ?? 0,
            pointerEvents: "none",
            visibility: "hidden",
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-3"
        align="start"
        onPointerDownOutside={(e) => {
          if (
            e.target instanceof Element &&
            (e.target.closest('[role="listbox"]') ||
              e.target.closest('[role="option"]'))
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Parent Task</Label>
            <Select
              value={task.dependsOnTempId || "none"}
              onValueChange={(val) => {
                const newVal = val === "none" ? undefined : val;
                onUpdate({
                  dependsOnTempId: newVal,
                  ...(newVal
                    ? {}
                    : {
                        dependencyType: "IMMEDIATE",
                        dependencyDelay: 0,
                      }),
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {getDependencyOptions(task.tempId).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn("space-y-1", !task.dependsOnTempId && "opacity-50")}
          >
            <Label className="text-xs">Relation Type</Label>
            <Select
              disabled={!task.dependsOnTempId}
              value={task.dependencyType || "IMMEDIATE"}
              onValueChange={(val) => {
                onUpdate({ dependencyType: val as any });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMMEDIATE">Immediately After</SelectItem>
                <SelectItem value="TIME_LAG">After Gap (Lag)</SelectItem>
                <SelectItem value="NO_RELATION">No Time Relation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(task.dependencyType === "TIME_LAG" || !task.dependencyType) && (
            <div
              className={cn("space-y-1", !task.dependsOnTempId && "opacity-50")}
            >
              <Label className="text-xs">Lag (minutes)</Label>
              <Input
                type="number"
                disabled={!task.dependsOnTempId}
                className="h-8 text-xs"
                value={task.dependencyDelay ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdate({ dependencyDelay: val });
                }}
              />
            </div>
          )}
        </div>
        <div className="mt-3 pt-2 flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={onClose}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
