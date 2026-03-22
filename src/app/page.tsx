import Link from "next/link";
import { LayoutDashboard, FileText, Briefcase, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col font-sans">
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 flex-col flex items-center justify-center text-center px-4">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
            Welcome to the POC
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mb-6 text-foreground">
            Manage your timelines <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">with precision</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
            A powerful proof-of-concept application for orchestrating master tasks, designing templates, and running simulations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/master-tasks">
              <Button size="lg" className="w-full sm:w-auto">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Master Tasks
              </Button>
            </Link>
            <Link href="/simulations">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Activity className="mr-2 h-5 w-5" />
                Run Simulation
              </Button>
            </Link>
          </div>
        </section>

        {/* Features / Quick Links */}
        <section className="w-full py-12 bg-white flex-1">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Card 1 */}
              <Link href="/templates" className="group rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-all hover:border-primary/50 flex flex-col">
                <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Templates</h3>
                <p className="text-sm text-muted-foreground mt-auto">
                  Design and manage reusable workflow templates.
                </p>
              </Link>
              
              {/* Card 2 */}
              <Link href="/fund-profiles" className="group rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-all hover:border-primary/50 flex flex-col">
                <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Fund Profiles</h3>
                <p className="text-sm text-muted-foreground mt-auto">
                  View and configure fund profiles and entities.
                </p>
              </Link>
              
              {/* Card 3 */}
              <Link href="/simulations" className="group rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-all hover:border-primary/50 flex flex-col">
                <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Simulations</h3>
                <p className="text-sm text-muted-foreground mt-auto">
                  Test workflows and validate task dependencies.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
