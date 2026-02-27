import Link from "next/link";
import { Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <Home className="h-5 w-5" />
          <span className="sr-only">Home</span>
        </Link>
      </div>
    </header>
  );
}
