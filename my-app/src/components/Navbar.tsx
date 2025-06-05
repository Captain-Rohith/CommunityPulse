"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { API_URL } from "@/lib/constants";
import { IssueMenu } from "./issues/IssueMenu";

export function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isSignedIn) return;

      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
  }, [isSignedIn, getToken]);

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold">
            CommunityPulse
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost">Events</Button>
            </Link>
            <IssueMenu />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <SignedIn>
            {isAdmin && (
              <div className="flex items-center space-x-4">
                <Link href="/admin/events">
                  <Button variant="outline">Manage Events</Button>
                </Link>
                <Link href="/admin/issues">
                  <Button variant="outline">Manage Issues</Button>
                </Link>
              </div>
            )}
            <Link href="/events/create">
              <Button>Create Event</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
