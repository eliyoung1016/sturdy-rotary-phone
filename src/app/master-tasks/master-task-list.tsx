"use client";

import { Pencil, Plus } from "lucide-react";
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
import type { MasterTaskInput } from "@/lib/schemas/master-task";

interface MasterTask extends MasterTaskInput {
  id: number;
}

interface MasterTaskListProps {
  tasks: MasterTask[] | undefined;
}

export function MasterTaskList({ tasks }: MasterTaskListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);

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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>

              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{task.type}</TableCell>
                  <TableCell>
                    {task.type === "CUTOFF" ? "-" : `${task.duration}m`}
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
                  colSpan={4}
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
      />

      <MasterTaskDialog
        open={!!editingTask}
        onOpenChange={(open: boolean) => !open && setEditingTask(null)}
        initialData={editingTask || undefined}
        mode="edit"
      />
    </>
  );
}
