"use client";

import { useMemo, useState } from "react";

import { updateSimulation } from "@/app/actions/simulation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimulationView } from "./simulation-view";

interface Task {
  tempId: string;
  name: string;
  dayOffset: number;
  startTime: string;
  duration: number;
  type?: "PROCESS" | "CUTOFF";
  color?: string;
  sequenceOrder: number;
  dependsOnId?: number | null;
  isCashConfirmed?: boolean;
  requiresWorkingHours?: boolean;
}

interface SimulationViewWrapperProps {
  simulation: any;
  masterTasks: any[];
}

export function SimulationViewWrapper({
  simulation,
  masterTasks,
}: SimulationViewWrapperProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [simulationName, setSimulationName] = useState(
    simulation.simulationName || "",
  );

  // Parse saved state if it exists, memoized to prevent re-parsing
  const initialCurrentTasks = useMemo(() => {
    return simulation.currentStateJson
      ? JSON.parse(simulation.currentStateJson)
      : null;
  }, [simulation.currentStateJson]);

  const initialTargetTasks = useMemo(() => {
    return simulation.targetStateJson
      ? JSON.parse(simulation.targetStateJson)
      : null;
  }, [simulation.targetStateJson]);

  const handleSave = async (
    currentTasks: Task[],
    targetTasks: Task[],
    metrics?: { reinvestmentGainHours?: number; idleTimeSavedMinutes?: number },
  ) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await updateSimulation(simulation.id, {
        simulationName,
        currentStateJson: JSON.stringify(currentTasks),
        targetStateJson: JSON.stringify(targetTasks),
        reinvestmentGainHours: metrics?.reinvestmentGainHours,
        idleTimeSavedMinutes: metrics?.idleTimeSavedMinutes,
      });

      if ("error" in result) {
        setSaveMessage(result.error || "Failed to save");
      } else {
        setSaveMessage("Simulation saved successfully!");
      }
    } catch (_err) {
      setSaveMessage("Failed to save simulation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex-1">
          <Label htmlFor="simulation-name" className="text-sm font-medium">
            Simulation Name
          </Label>
          <Input
            id="simulation-name"
            value={simulationName}
            onChange={(e) => setSimulationName(e.target.value)}
            className="mt-1"
            placeholder="Enter simulation name"
          />
        </div>
        {saveMessage && (
          <div
            className={`text-sm px-3 py-2 rounded ${
              saveMessage.includes("success")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {saveMessage}
          </div>
        )}
      </div>

      <SimulationView
        fund={simulation.fund}
        simulationId={simulation.id}
        onSave={handleSave}
        initialCurrentTasks={initialCurrentTasks}
        initialTargetTasks={initialTargetTasks}
        isSaving={isSaving}
        masterTasks={masterTasks}
      />
    </div>
  );
}
