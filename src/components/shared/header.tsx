import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md flex items-center justify-center group-hover:bg-primary/90 transition-colors">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Timeliner</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/master-tasks" className="hover:text-foreground transition-colors">
            Master Tasks
          </Link>
          <Link href="/templates" className="hover:text-foreground transition-colors">
            Templates
          </Link>
          <Link href="/fund-profiles" className="hover:text-foreground transition-colors">
            Fund Profiles
          </Link>
          <Link href="/simulations" className="hover:text-foreground transition-colors">
            Simulations
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/master-tasks" className="md:hidden">
            <Button size="sm">Open App</Button>
          </Link>
          <Link href="/master-tasks" className="hidden md:flex">
            <Button>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
