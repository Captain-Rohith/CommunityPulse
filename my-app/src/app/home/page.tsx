"use client";

import { EventCardsGrid } from "@/components/cards";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useState, useEffect } from "react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Calendar,
  Users,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";

// API base URL
const API_URL = "http://localhost:8000";
const ADMIN_EMAIL = "rohithvishwanath1789@gmail.com";

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allEvents, setAllEvents] = useState<any[]>([]); // Store all fetched events
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]); // Store filtered events
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([]);
  const [interestedEvents, setInterestedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState<string | null>(null);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [loadingPastEvents, setLoadingPastEvents] = useState(false);

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

  // Fetch registered and interested events
  useEffect(() => {
    const fetchUserEvents = async () => {
      if (!isSignedIn) return;

      try {
        const token = await getToken();

        // Fetch registered events
        const registeredResponse = await fetch(
          `${API_URL}/user/events/registered`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Fetch interested events
        const interestedResponse = await fetch(
          `${API_URL}/user/events/interested`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (registeredResponse.ok && interestedResponse.ok) {
          const registeredData = await registeredResponse.json();
          const interestedData = await interestedResponse.json();

          const formattedRegistered = registeredData.map((event: any) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.start_date).toISOString().split("T")[0],
            enddate: new Date(event.end_date).toISOString().split("T")[0],
            location: event.location,
            startTime: new Date(event.start_date).toTimeString().slice(0, 5),
            endTime: new Date(event.end_date).toTimeString().slice(0, 5),
            description: event.description,
            category: event.category,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
          }));

          const formattedInterested = interestedData.map((event: any) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.start_date).toISOString().split("T")[0],
            enddate: new Date(event.end_date).toISOString().split("T")[0],
            location: event.location,
            startTime: new Date(event.start_date).toTimeString().slice(0, 5),
            endTime: new Date(event.end_date).toTimeString().slice(0, 5),
            description: event.description,
            category: event.category,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
          }));

          setRegisteredEvents(formattedRegistered);
          setInterestedEvents(formattedInterested);
        }
      } catch (error) {
        console.error("Error fetching user events:", error);
      }
    };

    fetchUserEvents();
  }, [isSignedIn, getToken]);

  // Fetch all events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Build query parameters
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        params.append("upcoming", "true");
        params.append("approved_only", "true");

        // Make the API request
        const response = await axios.get(
          `${API_URL}/events?${params.toString()}`
        );

        // Format the events data
        const formattedEvents = response.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_date).toISOString().split("T")[0],
          enddate: new Date(event.end_date).toISOString().split("T")[0],
          location: event.location,
          startTime: new Date(event.start_date).toTimeString().slice(0, 5),
          endTime: new Date(event.end_date).toTimeString().slice(0, 5),
          description: event.description,
          category: event.category,
          attendees: event.attendees_count,
          image_path: event.image_path,
          is_approved: event.is_approved,
        }));

        // Filter out events that user is already registered for or interested in
        const filteredEvents = formattedEvents.filter(
          (event: any) =>
            !registeredEvents.some((e) => e.id === event.id) &&
            !interestedEvents.some((e) => e.id === event.id)
        );

        setAllEvents(filteredEvents);
        setFilteredEvents(filteredEvents);
        setError(null);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [category, registeredEvents, interestedEvents]);

  // Handle search and filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      // If search is empty, show all events (filtered by category if set)
      const categoryFiltered = category
        ? allEvents.filter((event) => event.category === category)
        : allEvents;
      setFilteredEvents(categoryFiltered);
      return;
    }

    // Search in title, description, location, and category
    const searchResults = allEvents.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower) ||
          event.category?.toLowerCase().includes(searchLower)) &&
        (!category || event.category === category)
      );
    });

    setFilteredEvents(searchResults);
  }, [searchTerm, category, allEvents]);

  // Setup axios interceptor to add auth token to requests
  useEffect(() => {
    const setupAuthInterceptor = async () => {
      if (isLoaded && isSignedIn) {
        const token = await getToken();

        // Add auth token to all requests
        axios.interceptors.request.use(
          async (config) => {
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
          },
          (error) => Promise.reject(error)
        );
      }
    };

    setupAuthInterceptor();
  }, [isLoaded, isSignedIn, getToken]);

  // Filter events by category
  interface CategorySelectHandler {
    (selectedCategory: string): void;
  }

  const handleCategorySelect: CategorySelectHandler = (selectedCategory) => {
    setCategory(selectedCategory);
  };

  interface MarkInterestHandler {
    (eventId: number): Promise<void>;
  }

  interface Event {
    id: number;
    title: string;
    date: string;
    enddate: string;
    location: string;
    startTime: string;
    endTime: string;
    description: string;
    category: string;
    attendees: number;
    image_path: string;
    is_approved: boolean;
    userInterested?: boolean;
  }

  const markInterest: MarkInterestHandler = async (eventId) => {
    if (!isSignedIn) {
      alert("Please sign in to mark interest in this event");
      return;
    }

    try {
      const token = await getToken();

      const response = await fetch(`${API_URL}/events/${eventId}/interest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark interest");
      }

      const data = await response.json();

      // Toggle the interest status and update the events list
      setFilteredEvents(
        filteredEvents.map((event) => {
          if (event.id === eventId) {
            const isCurrentlyInterested = event.userInterested || false;
            return {
              ...event,
              userInterested: !isCurrentlyInterested,
              attendees: isCurrentlyInterested
                ? event.attendees - 1
                : event.attendees + 1,
            };
          }
          return event;
        })
      );
    } catch (err) {
      console.error("Error marking interest:", err);
    }
  };

  // Add new effect for fetching past events
  useEffect(() => {
    const fetchPastEvents = async () => {
      if (!showPastEvents) return; // Only fetch when section is expanded

      try {
        setLoadingPastEvents(true);
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        params.append("past", "true");
        params.append("approved_only", "true");

        const response = await axios.get(
          `${API_URL}/events?${params.toString()}`
        );

        const formattedEvents = response.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_date).toISOString().split("T")[0],
          enddate: new Date(event.end_date).toISOString().split("T")[0],
          location: event.location,
          startTime: new Date(event.start_date).toTimeString().slice(0, 5),
          endTime: new Date(event.end_date).toTimeString().slice(0, 5),
          description: event.description,
          category: event.category,
          attendees: event.attendees_count,
          image_path: event.image_path,
          is_approved: event.is_approved,
        }));

        setPastEvents(formattedEvents);
      } catch (err) {
        console.error("Error fetching past events:", err);
      } finally {
        setLoadingPastEvents(false);
      }
    };

    fetchPastEvents();
  }, [showPastEvents, category]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex justify-between items-center py-4 px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Community Pulse</h1>
          </div>

          <Menubar className="hidden md:flex">
            <MenubarMenu>
              <MenubarTrigger>Events</MenubarTrigger>
              <MenubarContent>
                <MenubarItem
                  onClick={() => handleCategorySelect("Garage Sale")}
                >
                  <Link href="?category=Garage%20Sale" className="flex w-full">
                    Garage Sales
                  </Link>
                </MenubarItem>
                <MenubarItem
                  onClick={() => handleCategorySelect("Sports Match")}
                >
                  <Link href="?category=Sports%20Match" className="flex w-full">
                    Sports Matches
                  </Link>
                </MenubarItem>
                <MenubarItem
                  onClick={() => handleCategorySelect("Community Class")}
                >
                  <Link
                    href="?category=Community%20Class"
                    className="flex w-full"
                  >
                    Community Classes
                  </Link>
                </MenubarItem>
                <MenubarItem onClick={() => handleCategorySelect("Volunteer")}>
                  <Link href="?category=Volunteer" className="flex w-full">
                    Volunteer Opportunities
                  </Link>
                </MenubarItem>
                <MenubarItem onClick={() => handleCategorySelect("Exhibition")}>
                  <Link href="?category=Exhibition" className="flex w-full">
                    Exhibitions
                  </Link>
                </MenubarItem>
                <MenubarItem onClick={() => handleCategorySelect("Festival")}>
                  <Link href="?category=Festival" className="flex w-full">
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
                </SignedIn>
                <SignedOut>
                  <MenubarItem>
                    <SignInButton>Sign in to view your events</SignInButton>
                  </MenubarItem>
                </SignedOut>
              </MenubarContent>
            </MenubarMenu>
            {isAdmin && (
              <MenubarMenu>
                <MenubarTrigger>Admin</MenubarTrigger>
                <MenubarContent>
                  <SignedIn>
                    <MenubarItem>
                      <Link href="/admind" className="flex w-full">
                        Dashboard
                      </Link>
                    </MenubarItem>
                    <MenubarItem>
                      <Link href="/admind" className="flex w-full">
                        Organizer Panel
                      </Link>
                    </MenubarItem>
                  </SignedIn>
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

      <main className="container mx-auto flex-grow px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by title, description, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={`flex items-center gap-2 ${
                !category ? "bg-primary/10" : ""
              }`}
              onClick={() => setCategory(null)}
            >
              <Calendar size={16} />
              All Categories
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <Users size={16} />
              Upcoming
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {isSignedIn && registeredEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Your Registered Events
              </h2>
              <EventCardsGrid
                events={registeredEvents}
                showInterestButton={false}
              />
            </div>
          )}

          {isSignedIn && interestedEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Events You're Interested In
              </h2>
              <EventCardsGrid
                events={interestedEvents}
                showInterestButton={false}
              />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">
              {searchTerm
                ? `Search Results (${filteredEvents.length})`
                : "Upcoming Events"}
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm
                  ? "No events found matching your search"
                  : "No upcoming events available"}
              </div>
            ) : (
              <EventCardsGrid
                events={filteredEvents}
                onInterest={markInterest}
              />
            )}
          </div>

          {/* Past Events Section */}
          <div className="border-t pt-8">
            <button
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex items-center gap-2 text-2xl font-bold mb-4 hover:text-primary transition-colors"
            >
              Past Events
              {showPastEvents ? (
                <ChevronUp className="h-6 w-6" />
              ) : (
                <ChevronDown className="h-6 w-6" />
              )}
            </button>

            {showPastEvents && (
              <div className="mt-4">
                {loadingPastEvents ? (
                  <div className="text-center py-8">Loading past events...</div>
                ) : pastEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No past events found
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Showing {pastEvents.length} past events
                    </p>
                    <EventCardsGrid
                      events={pastEvents}
                      showInterestButton={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
