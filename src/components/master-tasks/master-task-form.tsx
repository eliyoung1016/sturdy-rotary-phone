"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import { createMasterTask, updateMasterTask } from "@/app/actions/master-task";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorSelect } from "@/components/ui/color-select";
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
      color: initialData?.color || "primary",
      isCashConfirmed: initialData?.isCashConfirmed || false,
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
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-3">
        {/* Row 1: Name (Grow) & Type (Fixed) */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="name"
              className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              Task Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Validate NAV"
              className="h-8 text-sm"
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs text-red-500">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="w-1/3 space-y-1">
            <Label
              htmlFor="type"
              className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              Type
            </Label>
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
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROCESS">Process</SelectItem>
                <SelectItem value="CUTOFF">Cutoff</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <span className="text-xs text-red-500">
                {errors.type.message}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Duration, Color, Cash Confirmed */}
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label
              htmlFor="duration"
              className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              Duration (min)
            </Label>
            <Input
              id="duration"
              type="number"
              placeholder="30"
              className="h-8 text-sm"
              {...register("duration")}
              disabled={watch("type") === "CUTOFF"}
            />
            {errors.duration && (
              <span className="text-xs text-red-500">
                {errors.duration.message}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="color"
              className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
            >
              Color
            </Label>
            <div className="h-8">
              <ColorSelect
                value={watch("color")}
                onValueChange={(val) => setValue("color", val)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 h-8 pb-1">
            <Checkbox
              id="isCashConfirmed"
              checked={watch("isCashConfirmed")}
              onCheckedChange={(checked) =>
                setValue("isCashConfirmed", checked as boolean)
              }
            />
            <Label htmlFor="isCashConfirmed" className="text-sm font-medium">
              Cash Confirmed
            </Label>
          </div>
        </div>

        {/* Row 3: Description */}
        <div className="space-y-1">
          <Label
            htmlFor="description"
            className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
          >
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Briefly describe the task..."
            className="h-20 resize-none text-sm"
            {...register("description")}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
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
