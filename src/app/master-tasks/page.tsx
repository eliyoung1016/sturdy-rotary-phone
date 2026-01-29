import { getMasterTasks } from "@/app/actions/master-task";
import type { MasterTaskInput } from "@/lib/schemas/master-task";
import { MasterTaskList } from "./master-task-list";

// Helper type to handle the data transformation
interface MasterTask extends MasterTaskInput {
  id: number;
}

export default async function MasterTasksPage() {
  const { data } = await getMasterTasks();

  // Transform data if needed, or cast if types align closely enough for this context
  // The DB result has more fields (created_at etc) but matches core structure
  const tasks = data?.map((t) => ({
    ...t,
    type: t.type as "CUTOFF" | "PROCESS",
  })) as MasterTask[] | undefined;

  return (
    <div className="container mx-auto py-10">
      <MasterTaskList tasks={tasks} />
    </div>
  );
}
