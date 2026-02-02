import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold">Timeliner POC</h1>
      <Link href="/master-tasks">
        <Button>View Master Tasks</Button>
      </Link>
      <Link href="/templates">
        <Button>View Templates</Button>
      </Link>
      <Link href="/fund-profiles">
        <Button>View Fund Profiles</Button>
      </Link>
      <Link href="/simulations">
        <Button variant="outline">View Simulation</Button>
      </Link>
    </main>
  );
}
