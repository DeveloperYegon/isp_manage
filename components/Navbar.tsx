"use client";
import { Wifi } from "lucide-react";
import Link from "next/dist/client/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
// This is a client component because it uses React hooks and context
// It is responsible for rendering the navigation bar and handling user authentication state
export function Navbar() {
return (
  
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wifi className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-foreground">MobileISP</span>
              <span className="text-[11px] text-muted-foreground">ISP Management Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>
)
}