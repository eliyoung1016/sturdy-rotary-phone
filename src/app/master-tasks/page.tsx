import { getMasterTasks, type MasterTaskWithRelations } from "@/app/actions/master-task";
import { MasterTaskList } from "./master-task-list";

export default async function MasterTasksPage() {
  const response = await getMasterTasks();

  if (!response.success || !response.data) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Master Tasks</h1>
        </div>
        <p className="text-red-500">Failed to load tasks: {!response.success ? response.error : 'No data'}</p>
      </div>
    );
  }

  const tasks = response.data;

  return (
    <div className="container mx-auto py-10">
      <MasterTaskList tasks={tasks} />
    </div>
  );
}
