import { getSimulationById } from "@/app/actions/simulation";
import { VerticalTimelineComparison } from "@/components/simulation/vertical-timeline-comparison";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface ComparisonPageProps {
  params: Promise<{ id: string }>;
}

export default async function ComparisonPage(props: ComparisonPageProps) {
  const params = await props.params;
  const simulationId = parseInt(params.id);

  if (isNaN(simulationId)) {
    notFound();
  }

  const result = await getSimulationById(simulationId);

  if ("error" in result) {
    return (
      <div className="container mx-auto py-10">
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {result.error}
        </div>
      </div>
    );
  }

  const simulation = result.data;

  // Parse the tasks from JSON
  const currentTasks = simulation.currentStateJson
    ? JSON.parse(simulation.currentStateJson)
    : [];
  const targetTasks = simulation.targetStateJson
    ? JSON.parse(simulation.targetStateJson)
    : [];

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/simulations/${simulationId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Simulation
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Timeline Comparison
            </h1>
            <p className="text-muted-foreground">
              {simulation.simulationName || "Untitled Simulation"}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison View */}
      {currentTasks.length > 0 && targetTasks.length > 0 ? (
        <VerticalTimelineComparison
          currentTasks={currentTasks}
          targetTasks={targetTasks}
          fundName={simulation.fund.name}
          officeStart={simulation.fund.officeStart || "09:00"}
          officeEnd={simulation.fund.officeEnd || "18:00"}
        />
      ) : (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>
              No comparison data available. Please ensure both current and
              target tasks are saved.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
