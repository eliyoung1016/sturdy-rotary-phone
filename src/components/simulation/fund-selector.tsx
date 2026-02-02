"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FundSelectorProps {
  funds: { id: number; name: string }[];
}

export function FundSelector({ funds }: FundSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFundId = searchParams.get("fundId");

  return (
    <div className="w-[300px] space-y-2">
      <Label>Select Fund Profile</Label>
      <Select
        value={currentFundId || ""}
        onValueChange={(val) => {
          router.push(`/simulation?fundId=${val}`);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a fund..." />
        </SelectTrigger>
        <SelectContent>
          {funds.map((f) => (
            <SelectItem key={f.id} value={f.id.toString()}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
