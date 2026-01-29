"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createSimulation } from "@/app/actions/simulation";
import { Loader2 } from "lucide-react";

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
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="simulationName">Simulation Name</Label>
        <Input
          id="simulationName"
          placeholder="e.g., Q1 2026 Analysis"
          value={formData.simulationName}
          onChange={(e) =>
            setFormData({ ...formData, simulationName: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fundId">Fund Profile</Label>
        <Select
          value={formData.fundId}
          onValueChange={(value) =>
            setFormData({ ...formData, fundId: value })
          }
        >
          <SelectTrigger id="fundId">
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

      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Simulation
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/simulations")}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
