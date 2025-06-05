"use client";

import { useAuth } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function IssueMenu() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Issues <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/issues" className="w-full">
            View All Issues
          </Link>
        </DropdownMenuItem>
        {isSignedIn && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/issues/create" className="w-full">
                Report Issue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/issues/manage" className="w-full">
                Manage My Issues
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
