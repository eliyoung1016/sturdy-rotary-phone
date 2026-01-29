import { getSimulationById } from "@/app/actions/simulation";
import { SimulationViewWrapper } from "@/components/simulation/simulation-view-wrapper";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface SimulationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SimulationDetailPage(
  props: SimulationDetailPageProps
) {
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

  // Check if simulation has been saved with data
  const hasComparisonData =
    simulation.currentStateJson && simulation.targetStateJson;

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/simulations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {simulation.simulationName || "Untitled Simulation"}
            </h1>
            <p className="text-muted-foreground">
              Created on {new Date(simulation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {hasComparisonData && (
          <Link href={`/simulations/${simulationId}/comparison`}>
            <Button variant="default">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Timeline Comparison
            </Button>
          </Link>
        )}
      </div>

      <SimulationViewWrapper simulation={simulation} />
    </div>
  );
}
