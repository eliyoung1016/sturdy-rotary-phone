"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSimulation } from "@/app/actions/simulation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Fund {
  id: number;
  name: string;
  isin?: string | null;
}

interface SimulationFormProps {
  funds: Fund[];
}

export function SimulationForm({ funds }: SimulationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    simulationName: "",
    fundId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.simulationName.trim()) {
      setError("Please enter a simulation name");
      return;
    }

    if (!formData.fundId) {
      setError("Please select a fund");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createSimulation({
        fundId: parseInt(formData.fundId),
        simulationName: formData.simulationName,
      });

      if ("error" in result) {
        setError(result.error || "Failed to create simulation");
        setIsLoading(false);
      } else {
        router.push(`/simulations/${result.data.id}`);
      }
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex gap-4 items-end bg-card p-4 rounded-lg border shadow-sm"
      >
        <div className="flex-1 space-y-1">
          <Label
            htmlFor="simulationName"
            className="text-xs uppercase text-muted-foreground font-semibold"
          >
            Simulation Name
          </Label>
          <Input
            id="simulationName"
            placeholder="e.g., Q1 2026 Analysis"
            value={formData.simulationName}
            onChange={(e) =>
              setFormData({ ...formData, simulationName: e.target.value })
            }
            required
            className="h-9"
          />
        </div>

        <div className="w-[300px] space-y-1">
          <Label
            htmlFor="fundId"
            className="text-xs uppercase text-muted-foreground font-semibold"
          >
            Fund Profile
          </Label>
          <Select
            value={formData.fundId}
            onValueChange={(value) =>
              setFormData({ ...formData, fundId: value })
            }
          >
            <SelectTrigger id="fundId" className="h-9">
              <SelectValue placeholder="Select a fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id.toString()}>
                  {fund.name} {fund.isin ? `(${fund.isin})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} className="h-9">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Simulation
          </Button>
        </div>
      </form>
    </div>
  );
}
