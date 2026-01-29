"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSimulation } from "@/app/actions/simulation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteSimulationButtonProps {
  simulationId: number;
}

export function DeleteSimulationButton({
  simulationId,
}: DeleteSimulationButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this simulation?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteSimulation(simulationId);

      if ("error" in result) {
        alert(result.error);
        setIsDeleting(false);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("Failed to delete simulation");
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
