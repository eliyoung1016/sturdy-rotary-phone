import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { deleteTemplate, getTemplate } from "@/app/actions/template";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePage({ params }: PageProps) {
  const { id } = await params;
  const templateId = Number(id);

  if (Number.isNaN(templateId)) {
    notFound();
  }

  const { success, data: template, error } = await getTemplate(templateId);

  if (!success || !template) {
    // If template not found or error
    if (error === "Template not found") {
      notFound();
    }
    throw new Error(error || "Failed to load template");
  }

  // Server action wrapper for delete button form
  async function deleteAction() {
    "use server";
    await deleteTemplate(templateId);
    redirect("/templates");
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-muted-foreground">
            {template.description || "No description provided."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/templates/${templateId}/edit`} className={buttonVariants({ variant: "outline" })}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Template
          </Link>
          <form action={deleteAction}>
            <Button variant="destructive" type="submit">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Template
            </Button>
          </form>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Tasks Configuration
        </h2>

        {template.tasks.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            No tasks defined in this template.
          </div>
        ) : (
          <div className="grid gap-4">
            {template.tasks.map((task, index) => (
              <Card key={task.tempId}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-sm">
                          #{index + 1}
                        </span>
                        {task.name}
                      </CardTitle>
                      <CardDescription>
                        Type:{" "}
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80">
                          {task.type}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="font-medium">
                        {task.dayOffset === 0
                          ? "Day D"
                          : task.dayOffset > 0
                            ? `D+${task.dayOffset}`
                            : `D${task.dayOffset}`}
                      </div>
                      <div>{task.startTime}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{task.duration} mins</span>
                    </div>
                    {task.dependsOnId && (
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">
                          Depends On
                        </span>
                        {/* We need to find the name of the parent task. 
                             The 'tasks' array has tempIds, but dependsOnId is a DB ID.
                             Wait, getTemplate returns tasks with 'dbId' and 'dependsOnId'.
                             So we can look it up.
                         */}
                        <span>
                          {template.tasks.find(
                            (t) => t.dbId === task.dependsOnId,
                          )?.name || "Unknown Task"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
