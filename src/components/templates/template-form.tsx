"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { getMasterTasks } from "@/app/actions/master-task";
import { createTemplate, updateTemplate } from "@/app/actions/template";
import { TaskListEditor } from "@/components/shared/task-list-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type TemplateInput, templateSchema } from "@/lib/schemas/template";

interface MasterTask {
  id: number;
  name: string;
  duration: number;
  type: "PROCESS" | "CUTOFF";
  color: string;
  isCashConfirmed: boolean;
  requiresWorkingHours: boolean;
}

interface TemplateFormProps {
  initialData?: TemplateInput;
  templateId?: number;
}

export function TemplateForm({ initialData, templateId }: TemplateFormProps) {
  const router = useRouter();
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      tasks: initialData?.tasks || [],
    },
  });

  useEffect(() => {
    async function fetchMasterTasks() {
      const res = await getMasterTasks();
      if (res.success && res.data) {
        setMasterTasks(res.data as unknown as MasterTask[]);
      }
    }
    fetchMasterTasks();
  }, []);

  const onSubmit = async (data: TemplateInput) => {
    setLoading(true);
    try {
      const orderedTasks = data.tasks.map((task, index) => ({
        ...task,
        sequenceOrder: index,
      }));

      let res;
      if (templateId) {
        res = await updateTemplate(templateId, {
          ...data,
          tasks: orderedTasks,
        });
      } else {
        res = await createTemplate({ ...data, tasks: orderedTasks });
      }

      if (!res.success) {
        alert(
          `Failed to ${templateId ? "update" : "create"} template. Please check the form.`,
        );
      } else {
        router.refresh();
        router.push("/templates");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="space-y-1">
              <Label
                htmlFor="name"
                className="text-xs uppercase text-muted-foreground font-semibold"
              >
                Template Name
              </Label>
              <Input
                {...form.register("name")}
                placeholder="e.g. Current Fund Practice"
                className="h-8"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="description"
                className="text-xs uppercase text-muted-foreground font-semibold"
              >
                Description
              </Label>
              <Textarea
                {...form.register("description")}
                placeholder="Enter a brief overview..."
                className="h-20 resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <TaskListEditor name="tasks" masterTasks={masterTasks} />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : templateId
                ? "Update Template"
                : "Create Template"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
