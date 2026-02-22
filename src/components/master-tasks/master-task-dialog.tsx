"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MasterTaskWithRelations } from "@/app/actions/master-task";
import { MasterTaskForm } from "./master-task-form";

interface MasterTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: MasterTaskWithRelations;
  mode: "create" | "edit";
  tasks?: MasterTaskWithRelations[];
}

export function MasterTaskDialog({
  open,
  onOpenChange,
  initialData,
  mode,
  tasks,
}: MasterTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Master Task" : "Edit Master Task"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new generic task that can be used in templates."
              : "Update the details of the master task."}
          </DialogDescription>
        </DialogHeader>
        <MasterTaskForm
          initialData={initialData}
          mode={mode}
          tasks={tasks}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
