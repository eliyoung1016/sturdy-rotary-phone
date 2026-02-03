import { getSimulationById } from "@/app/actions/simulation";
import { VerticalTimelineComparison } from "@/components/simulation/vertical-timeline-comparison";
import { HorizontalTimelineComparison } from "@/components/simulation/horizontal-timeline-comparison"; // [NEW]
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, LayoutList, Columns } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // [NEW] assume existing

interface ComparisonPageProps {
  params: Promise<{ id: string }>;
}

export default async function ComparisonPage(props: ComparisonPageProps) {
  const params = await props.params;
  const simulationId = parseInt(params.id);

  if (Number.isNaN(simulationId)) {
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
        <Tabs defaultValue="vertical" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="vertical" className="flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                Vertical View
              </TabsTrigger>
              <TabsTrigger
                value="horizontal"
                className="flex items-center gap-2"
              >
                <Columns className="h-4 w-4" />
                Horizontal View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="vertical" className="animate-in fade-in-50">
            <VerticalTimelineComparison
              currentTasks={currentTasks}
              targetTasks={targetTasks}
              fundName={simulation.fund.name}
              officeStart={simulation.fund.officeStart || "09:00"}
              officeEnd={simulation.fund.officeEnd || "18:00"}
            />
          </TabsContent>

          <TabsContent value="horizontal" className="animate-in fade-in-50">
            <HorizontalTimelineComparison
              currentTasks={currentTasks}
              targetTasks={targetTasks}
              fundName={simulation.fund.name}
            />
          </TabsContent>
        </Tabs>
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
