import { getAllSimulations, deleteSimulation } from "@/app/actions/simulation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, PlusCircle, Trash2, Edit, Clock } from "lucide-react";
import Link from "next/link";
import { DeleteSimulationButton } from "@/components/simulation/delete-simulation-button";

export default async function SimulationsPage() {
  const result = await getAllSimulations();

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

  const simulations = result.data;

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Saved Simulations
            </h1>
            <p className="text-muted-foreground">
              Manage and review your timeline simulations.
            </p>
          </div>
          <Link href="/simulations/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Simulation
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Simulations</CardTitle>
          <CardDescription>
            {simulations.length === 0
              ? "No simulations saved yet."
              : `${simulations.length} simulation(s) found.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No simulations yet</p>
              <p className="text-sm mt-2">
                Create your first simulation to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Gain (hrs)</TableHead>
                  <TableHead>Idle Saved (min)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulations.map((simulation) => (
                  <TableRow key={simulation.id}>
                    <TableCell className="font-medium">
                      {simulation.simulationName || "Untitled"}
                    </TableCell>
                    <TableCell>{simulation.fund.name}</TableCell>
                    <TableCell>
                      {new Date(simulation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {simulation.reinvestmentGainHours?.toFixed(2) ?? "-"}
                    </TableCell>
                    <TableCell>
                      {simulation.idleTimeSavedMinutes ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/simulations/${simulation.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <DeleteSimulationButton simulationId={simulation.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
