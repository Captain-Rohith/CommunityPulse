"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventCardsGrid } from "@/components/cards";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  date: string;
  enddate: string;
  startTime: string;
  endTime: string;
  image_path?: string;
  organizer_id: number;
  is_approved: boolean;
  attendees: number;
  likes_count?: number;
  shares_count?: number;
}

export default function OrganizingEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken, isSignedIn } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchOrganizedEvents = async () => {
      if (!isSignedIn) {
        return;
      }

      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/user/events/organizing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch organized events");
        }

        const data = await response.json();

        // Format the events data
        const formattedEvents = data.map((event: any) => ({
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
          likes_count: event.likes_count || 0,
          shares_count: event.shares_count || 0,
        }));

        setEvents(formattedEvents);
        setFilteredEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching organized events:", error);
        toast.error("Failed to load your organized events");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizedEvents();
  }, [isSignedIn, getToken]);

  // Handle search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(events);
      return;
    }

    const searchResults = events.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower) ||
        event.category?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredEvents(searchResults);
  }, [searchTerm, events]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Please sign in to view your organized events
          </h1>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/home">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Events You're Organizing</h1>
            </div>
            <Link href="/addevent">
              <Button className="flex items-center gap-2">
                <PlusCircle size={16} />
                Create New Event
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search your events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-8">Loading your events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No events found matching your search"
                  : "You haven't organized any events yet"}
              </p>
              <Link href="/addevent">
                <Button>Create Your First Event</Button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {searchTerm
                    ? `Search Results (${filteredEvents.length})`
                    : `Your Events (${filteredEvents.length})`}
                </h2>
              </div>
              <EventCardsGrid
                events={filteredEvents}
                showInterestButton={false}
                showEditButton={true}
                showApprovalStatus={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
