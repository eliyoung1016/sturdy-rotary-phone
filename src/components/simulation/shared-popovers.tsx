import { ColorSelect } from "@/components/ui/color-select";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskItem } from "@/types/simulation";

interface SharedColorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  task: TaskItem | null;
  onUpdate: (updates: Partial<TaskItem>) => void;
}

export function SharedColorPopover({
  isOpen,
  onClose,
  anchorEl,
  task,
  onUpdate,
}: SharedColorPopoverProps) {
  if (!task) return null;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          const originalEvent = eventDetails?.event;
          if (
            originalEvent &&
            originalEvent.target instanceof Element &&
            (originalEvent.target.closest('[role="listbox"]') ||
              originalEvent.target.closest('[role="option"]'))
          ) {
            return;
          }
          onClose();
        }
      }}
    >
      <PopoverTrigger render={(<div
        style={{
          position: "fixed",
          top: anchorEl?.getBoundingClientRect().top ?? 0,
          left: anchorEl?.getBoundingClientRect().left ?? 0,
          width: anchorEl?.getBoundingClientRect().width ?? 0,
          height: anchorEl?.getBoundingClientRect().height ?? 0,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />)} />
      <PopoverContent
        className="w-[200px] p-4"
        align="end"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <ColorSelect
              value={task.color}
              onValueChange={(val) => {
                onUpdate({ color: val });
                onClose();
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
