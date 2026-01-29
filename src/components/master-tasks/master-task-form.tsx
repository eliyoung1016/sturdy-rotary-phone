"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { createMasterTask, updateMasterTask } from "@/app/actions/master-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type MasterTaskInput,
  masterTaskSchema,
} from "@/lib/schemas/master-task";

interface MasterTaskFormProps {
  initialData?: MasterTaskInput & { id?: number };
  mode: "create" | "edit";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MasterTaskForm({
  initialData,
  mode,
  onSuccess,
  onCancel,
}: MasterTaskFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MasterTaskInput>({
    // @ts-expect-error - zodResolver type inference issue with coerced numbers
    resolver: zodResolver(masterTaskSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      type: initialData?.type || "PROCESS",
      duration: initialData?.duration ?? 30,
    },
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<MasterTaskInput> = async (data) => {
    setError(null);
    try {
      let res: unknown;
      if (mode === "edit" && initialData?.id) {
        res = await updateMasterTask(initialData.id, data);
      } else {
        res = await createMasterTask(data);
      }

      const response = res as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (response?.success) {
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      } else if (response && !response.success) {
        setError(response.message || response.error || "Something went wrong");
      }
    } catch (e) {
      console.error(e);
      setError("An unexpected error occurred.");
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* biome-ignore lint/suspicious/noExplicitAny: Resolving react-hook-form type mismatch */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Task Name</Label>
          <Input
            id="name"
            placeholder="e.g. Validate NAV"
            {...register("name")}
          />
          {errors.name && (
            <span className="text-sm text-red-500">{errors.name.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Briefly describe the task..."
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select
              onValueChange={(val) => {
                const newType = val as "CUTOFF" | "PROCESS";
                setValue("type", newType, { shouldValidate: true });
                if (newType === "CUTOFF") {
                  setValue("duration", 0);
                }
              }}
              defaultValue={watch("type")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROCESS">Process</SelectItem>
                <SelectItem value="CUTOFF">Cutoff</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <span className="text-sm text-red-500">
                {errors.type.message}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="30"
              {...register("duration")}
              disabled={watch("type") === "CUTOFF"}
            />
            {errors.duration && (
              <span className="text-sm text-red-500">
                {errors.duration.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create Task"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
