"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MasterTaskInput } from "@/lib/schemas/master-task";
import { MasterTaskForm } from "./master-task-form";

interface MasterTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: MasterTaskInput & { id?: number };
  mode: "create" | "edit";
}

export function MasterTaskDialog({
  open,
  onOpenChange,
  initialData,
  mode,
}: MasterTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
