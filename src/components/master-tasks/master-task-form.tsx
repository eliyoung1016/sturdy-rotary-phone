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
  initialData?: MasterTaskInput & {
    id?: number;
    correspondingTaskOf?: { id: number } | null;
  };
  mode: "create" | "edit";
  tasks?: (MasterTaskInput & {
    id: number;
    correspondingTaskId?: number | null;
    correspondingTaskOf?: { id: number } | null;
  })[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MasterTaskForm({
  initialData,
  mode,
  tasks = [],
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
      requiresWorkingHours: initialData?.requiresWorkingHours || false,
      shortName: initialData?.shortName || "",
      correspondingTaskId:
        initialData?.correspondingTaskId ??
        initialData?.correspondingTaskOf?.id ??
        null,
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

  // Determine which tasks should be disabled
  const getTaskOption = (task: (typeof tasks)[0]) => {
    // Cannot select self
    if (initialData?.id && task.id === initialData.id) return null;

    // Is it currently linked to someone?
    const linkedToId = task.correspondingTaskId ?? task.correspondingTaskOf?.id;

    // If it's linked
    if (linkedToId) {
      // Allow if it's linked to US (we are editing the link, it stays selected)
      if (initialData?.id && linkedToId === initialData.id) {
        return { disabled: false, label: task.name };
      }
      // Otherwise disabled
      const partnerName =
        tasks.find((t) => t.id === linkedToId)?.name || "Task #" + linkedToId;
      return {
        disabled: true,
        label: `${task.name} (Linked to ${partnerName})`,
      };
    }

    return { disabled: false, label: task.name };
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* biome-ignore lint/suspicious/noExplicitAny: Resolving react-hook-form type mismatch */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Top: Name */}
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
          >
            Task Name
          </Label>
          <Input
            id="name"
            placeholder="e.g. Validate NAV"
            className="h-9"
            {...register("name")}
          />
          {errors.name && (
            <span className="text-xs text-red-500">{errors.name.message}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Properties */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-24 space-y-2">
                <Label
                  htmlFor="shortName"
                  className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
                >
                  Short
                </Label>
                <Input
                  id="shortName"
                  placeholder="VAL"
                  className="h-9 uppercase font-mono"
                  maxLength={3}
                  {...register("shortName")}
                />
                {errors.shortName && (
                  <span className="text-xs text-red-500">
                    {errors.shortName.message}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
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
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROCESS">Process</SelectItem>
                    <SelectItem value="CUTOFF">Cutoff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="duration"
                  className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
                >
                  Duration
                </Label>
                <div className="relative">
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    className="h-9 pr-8"
                    {...register("duration")}
                    disabled={watch("type") === "CUTOFF"}
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    min
                  </div>
                </div>
                {errors.duration && (
                  <span className="text-xs text-red-500">
                    {errors.duration.message}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="color"
                  className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
                >
                  Color
                </Label>
                <div className="h-9">
                  <ColorSelect
                    value={watch("color")}
                    onValueChange={(val) => setValue("color", val)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="correspondingTaskId"
                className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
              >
                Linked Task
              </Label>
              <Select
                onValueChange={(val) => {
                  setValue(
                    "correspondingTaskId",
                    val === "none" ? null : Number(val),
                  );
                }}
                value={watch("correspondingTaskId")?.toString() || "none"}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select companion task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tasks.map((task) => {
                    const opt = getTaskOption(task);
                    if (!opt) return null;
                    return (
                      <SelectItem
                        key={task.id}
                        value={task.id.toString()}
                        disabled={opt.disabled}
                      >
                        {opt.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column: Flags & Description */}
          <div className="space-y-4">
            <div className="space-y-3 pt-1">
              <div className="flex items-start space-x-3 p-3 border rounded-md bg-muted/20">
                <Checkbox
                  id="isCashConfirmed"
                  checked={watch("isCashConfirmed")}
                  onCheckedChange={(checked) =>
                    setValue("isCashConfirmed", checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="isCashConfirmed"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Cash Confirmed
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Indicates that this task confirms a cash movement.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-md bg-muted/20">
                <Checkbox
                  id="requiresWorkingHours"
                  checked={watch("requiresWorkingHours")}
                  onCheckedChange={(checked) =>
                    setValue("requiresWorkingHours", checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="requiresWorkingHours"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Working Hours
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Task must be performed during working hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-xs text-muted-foreground font-semibold uppercase tracking-wider"
              >
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional details about this task..."
                className="h-[108px] resize-none"
                {...register("description")}
              />
            </div>
          </div>
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
