import { getFundProfiles } from "@/app/actions/fund-profiles";
import { SimulationForm } from "@/components/simulation/simulation-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewSimulationPage() {
  const funds = await getFundProfiles();

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Simulation
        </h1>
        <p className="text-muted-foreground">
          Select a fund profile and create a timeline simulation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SimulationForm funds={funds} />
        </CardContent>
      </Card>
    </div>
  );
}
