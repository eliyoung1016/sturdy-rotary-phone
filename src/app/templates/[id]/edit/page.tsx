import { notFound } from "next/navigation";
import { getTemplate } from "@/app/actions/template";
import { TemplateForm } from "@/components/templates/template-form";
import type { TemplateInput } from "@/lib/schemas/template";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const templateId = Number(id);

  if (Number.isNaN(templateId)) {
    notFound();
  }

  const { success, data: template, error } = await getTemplate(templateId);

  if (!success || !template) {
    if (error === "Template not found") {
      notFound();
    }
    throw new Error(error || "Failed to load template");
  }

  // Transform to match TemplateInput
  const initialData: TemplateInput = {
    name: template.name,
    description: template.description || undefined, // Convert null to undefined
    tasks: template.tasks.map((t) => ({
      ...t,
      taskId: t.taskId || undefined, // Convert null to undefined
    })),
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
        <p className="text-muted-foreground">
          Modify the details and tasks for this template.
        </p>
      </div>
      <TemplateForm initialData={initialData} templateId={templateId} />
    </div>
  );
}
