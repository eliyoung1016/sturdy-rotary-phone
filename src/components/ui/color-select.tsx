import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_COLORS } from "@/lib/constants/colors";

interface ColorSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorSelect({
  value,
  onValueChange,
  disabled,
}: ColorSelectProps) {
  return (
    <Select
      value={value || "primary"}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select color" />
      </SelectTrigger>
      <SelectContent>
        {TASK_COLORS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{
                  background: option.color,
                  border: "border" in option ? option.border : undefined,
                }}
              />
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
