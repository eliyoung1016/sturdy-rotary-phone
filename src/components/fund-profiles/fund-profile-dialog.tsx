"use client";

import { upsertFundProfile } from "@/app/actions/fund-profiles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FundProfileInput,
  fundProfileSchema,
} from "@/lib/schemas/fund-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

interface FundProfileDialogProps {
  profile?: FundProfileInput;
  templates: { id: number; name: string }[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FundProfileDialog({
  profile,
  templates,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: FundProfileDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  // Default values need to handle nulls from the DB profile if passing raw Prisma objects
  // But here we expect profile to be sanitised or matching FundProfileInput
  const form = useForm<FundProfileInput>({
    resolver: zodResolver(fundProfileSchema) as any,
    defaultValues: profile || {
      name: "",
      isin: "",
      officeStart: "09:00",
      officeEnd: "18:00",
      timezone: "CET",
      currentTemplateId: null,
      targetTemplateId: null,
    },
  });

  const onSubmit: SubmitHandler<FundProfileInput> = (data) => {
    startTransition(async () => {
      const result = await upsertFundProfile(data);
      if (result.success) {
        setOpen(false);
        form.reset();
      } else {
        console.error(result.error);
        // Could add toast error here
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {profile?.id ? "Edit Fund Profile" : "Create Fund Profile"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Fund Name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isin">ISIN</Label>
            <Input
              id="isin"
              placeholder="ISIN (Optional)"
              {...form.register("isin")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="officeStart">Office Start</Label>
              <Input
                type="time"
                id="officeStart"
                {...form.register("officeStart")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officeEnd">Office End</Label>
              <Input
                type="time"
                id="officeEnd"
                {...form.register("officeEnd")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...form.register("timezone")} />
          </div>

          <div className="space-y-2">
            <Label>Current Template (T+2/3)</Label>
            <Select
              onValueChange={(value) =>
                form.setValue("currentTemplateId", value ? Number(value) : null)
              }
              defaultValue={
                profile?.currentTemplateId
                  ? profile.currentTemplateId.toString()
                  : ""
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target Template (T+1)</Label>
            <Select
              onValueChange={(value) =>
                form.setValue("targetTemplateId", value ? Number(value) : null)
              }
              defaultValue={
                profile?.targetTemplateId
                  ? profile.targetTemplateId.toString()
                  : ""
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
