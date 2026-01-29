import { TemplateForm } from "@/components/templates/template-form";

export default function NewTemplatePage() {
  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Template
        </h1>
        <p className="text-muted-foreground">
          Define the sequence of tasks for this process template.
        </p>
      </div>
      <TemplateForm />
    </div>
  );
}
