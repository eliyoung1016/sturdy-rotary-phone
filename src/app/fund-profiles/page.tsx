import { Edit2 } from "lucide-react";
import Link from "next/link";

import {
  getFundProfiles,
  getTemplatesForSelect,
} from "@/app/actions/fund-profiles";
import { FundProfileDialog } from "@/components/fund-profiles/fund-profile-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function FundProfilesPage() {
  const [profiles, templates] = await Promise.all([
    getFundProfiles(),
    getTemplatesForSelect(),
  ]);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fund Profiles</h1>
          <p className="text-muted-foreground mt-2">
            Manage fund profiles and their associated templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <FundProfileDialog
            templates={templates}
            trigger={<Button>Create Fund Profile</Button>}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Office Hours</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Current Template</TableHead>
              <TableHead>Target Template</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center h-24 text-muted-foreground"
                >
                  No fund profiles found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell>{profile.isin || "-"}</TableCell>
                  <TableCell>
                    {profile.officeStart} - {profile.officeEnd}
                  </TableCell>
                  <TableCell>{profile.timezone}</TableCell>
                  <TableCell>{profile.currentTemplate?.name || "-"}</TableCell>
                  <TableCell>{profile.targetTemplate?.name || "-"}</TableCell>
                  <TableCell>
                    <FundProfileDialog
                      profile={{
                        ...profile,
                        isin: profile.isin || "",
                        officeStart: profile.officeStart || "09:00",
                        officeEnd: profile.officeEnd || "18:00",
                        timezone: profile.timezone || "UTC",
                        currentTemplateId: profile.currentTemplateId,
                        targetTemplateId: profile.targetTemplateId,
                      }}
                      templates={templates}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
