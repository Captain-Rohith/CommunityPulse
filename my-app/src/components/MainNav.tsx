import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function MainNav() {
  const pathname = usePathname();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isLoaded && isSignedIn) {
        try {
          const token = await getToken();
          const response = await fetch(`${API_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setIsAdmin(userData.is_admin);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
        }
      }
    };

    checkAdminStatus();
  }, [isLoaded, isSignedIn, getToken]);

  // Get context-aware menu items based on current path
  const getContextMenuItems = () => {
    if (pathname.startsWith("/events/")) {
      return (
        <MenubarMenu>
          <MenubarTrigger>Event Options</MenubarTrigger>
          <MenubarContent>
            <SignedIn>
              <MenubarItem>
                <Link href={`${pathname}/edit`} className="flex w-full">
                  Edit Event
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link href={`${pathname}/dashboard`} className="flex w-full">
                  Event Dashboard
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link href={`${pathname}/attendees`} className="flex w-full">
                  View Attendees
                </Link>
              </MenubarItem>
            </SignedIn>
          </MenubarContent>
        </MenubarMenu>
      );
    }

    if (pathname === "/my-events/organizing") {
      return (
        <MenubarMenu>
          <MenubarTrigger>Organizer Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Link href="/addevent" className="flex w-full">
                Create New Event
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/dashboard" className="flex w-full">
                Organizer Dashboard
              </Link>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      );
    }

    if (pathname === "/dashboard") {
      return (
        <MenubarMenu>
          <MenubarTrigger>Dashboard Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Link href="/addevent" className="flex w-full">
                Create New Event
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/my-events/organizing" className="flex w-full">
                My Events
              </Link>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      );
    }

    // Default menu items for home and other pages
    return (
      <>
        <MenubarMenu>
          <MenubarTrigger>Events</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Link href="/?category=Garage%20Sale" className="flex w-full">
                Garage Sales
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/?category=Sports%20Match" className="flex w-full">
                Sports Matches
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/?category=Community%20Class" className="flex w-full">
                Community Classes
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/?category=Volunteer" className="flex w-full">
                Volunteer Opportunities
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/?category=Exhibition" className="flex w-full">
                Exhibitions
              </Link>
            </MenubarItem>
            <MenubarItem>
              <Link href="/?category=Festival" className="flex w-full">
                Small Festivals
              </Link>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>My Events</MenubarTrigger>
          <MenubarContent>
            <SignedIn>
              <MenubarItem>
                <Link href="/my-events/attending" className="flex w-full">
                  Events I'm Attending
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link href="/my-events/organizing" className="flex w-full">
                  Events I'm Organizing
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link href="/dashboard" className="flex w-full">
                  Organizer Dashboard
                </Link>
              </MenubarItem>
            </SignedIn>
            <SignedOut>
              <MenubarItem>
                <SignInButton>Sign in to view your events</SignInButton>
              </MenubarItem>
            </SignedOut>
          </MenubarContent>
        </MenubarMenu>
      </>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Image
              src="/assets/CPlogo.svg"
              alt="Logo"
              width={300}
              height={300}
              priority
            />
          </Link>
        </div>

        <Menubar className="hidden md:flex">
          <Link
            href="/home"
            className="text-sm px-3 py-2 font-medium rounded-md"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-sm px-3 py-2 font-medium rounded-md"
          >
            About
          </Link>
          {getContextMenuItems()}
          {isAdmin && (
            <MenubarMenu>
              <MenubarTrigger>Admin</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/admind" className="flex w-full">
                    Admin Dashboard
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}
        </Menubar>

        <div className="flex items-center gap-4">
          <SignedIn>
            <Link href="/addevent">
              <Button className="hidden md:flex items-center gap-2">
                <PlusCircle size={16} />
                Create Event
              </Button>
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
    </header>
  );
}
