"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartBar } from "lucide-react";

const API_URL = "http://localhost:8000";

interface Event {
  id: number;
  title: string;
  category: string;
  type: string;
  views: number;
  attendees_count: number;
  organizer: {
    id: number;
    email: string;
  };
}

export default function DashboardIndex() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/user/events/organizing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [getToken]);

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 text-red-500">Error: {error}</div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Event Dashboards</h1>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          You haven't created any events yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                  {event.category} • {event.type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Views</p>
                    <p className="text-2xl font-bold">{event.views}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attendees</p>
                    <p className="text-2xl font-bold">
                      {event.attendees_count}
                    </p>
                  </div>
                </div>
                <Link href={`/dashboard/${event.id}`}>
                  <Button className="w-full">
                    <ChartBar className="mr-2 h-4 w-4" />
                    View Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
