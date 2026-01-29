import { prisma } from "@/lib/db";
import { TemplateList } from "./template-list";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { id: "desc" },
  });

  return (
    <div className="container mx-auto py-10">
      <TemplateList templates={templates} />
    </div>
  );
}
