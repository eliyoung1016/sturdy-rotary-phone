import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <Home className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
