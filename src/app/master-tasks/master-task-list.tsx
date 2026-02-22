"use client";

import { DollarSign, Pencil, Plus, Clock } from "lucide-react";
import { useState } from "react";
import { MasterTaskDialog } from "@/components/master-tasks/master-task-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TASK_COLORS } from "@/lib/constants/colors";
import type { MasterTaskWithRelations } from "@/app/actions/master-task";

interface MasterTaskListProps {
  tasks: MasterTaskWithRelations[] | undefined;
}

export function MasterTaskList({ tasks }: MasterTaskListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MasterTaskWithRelations | null>(null);

  // Helper to get color value for display
  const getColorValue = (colorName: string | undefined): string => {
    const found = TASK_COLORS.find((c) => c.value === (colorName || "primary"));
    return found ? found.color : "#3b82f6"; // Default blue fallback
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Tasks</h1>
          <p className="text-muted-foreground">
            Manage your library of reusable tasks.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableCaption>A list of your master tasks.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Short</TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="hidden md:table-cell">
                Description
              </TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-xs">
                    {task.shortName || "-"}
                  </TableCell>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.correspondingTask?.name ||
                      task.correspondingTaskOf?.name ||
                      "-"}
                  </TableCell>
                  <TableCell>{task.type}</TableCell>
                  <TableCell>
                    {task.type === "CUTOFF" ? "-" : `${task.duration}m`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {task.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{
                          background: getColorValue(task.color ?? undefined),
                        }}
                        title={`Color: ${task.color || "primary"}`}
                      />
                      {task.isCashConfirmed && (
                        <div title="Cash Confirmed">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {task.requiresWorkingHours && (
                        <div title="Requires Working Hours">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTask(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No tasks found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <MasterTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        tasks={tasks}
      />

      <MasterTaskDialog
        open={!!editingTask}
        onOpenChange={(open: boolean) => !open && setEditingTask(null)}
        initialData={editingTask || undefined}
        mode="edit"
        tasks={tasks}
      />
    </>
  );
}
