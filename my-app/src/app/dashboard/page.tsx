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
import { ChartBar, Eye, Users, PlusCircle } from "lucide-react";
import { MainLayout } from "@/components/layouts/MainLayout";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { cn } from "@/lib/utils";

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
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <LoadingAnimation />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Error Loading Events
              </h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                Event Dashboards
              </h1>
              <p className="text-lg text-gray-600">
                Manage and track your events' performance
              </p>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <PlusCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-6">
                  You haven't created any events yet.
                </p>
                <Link href="/addevent">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-gray-800">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            event.category === "Garage Sale"
                              ? "bg-orange-100"
                              : event.category === "Sports Match"
                              ? "bg-blue-100"
                              : event.category === "Community Class"
                              ? "bg-purple-100"
                              : event.category === "Volunteer"
                              ? "bg-green-100"
                              : event.category === "Exhibition"
                              ? "bg-yellow-100"
                              : "bg-pink-100"
                          )}
                        ></span>
                        {event.category} • {event.type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Eye className="w-4 h-4 text-purple-500" />
                            <span>Views</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {event.views}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span>Attendees</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {event.attendees_count}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/${event.id}`}>
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
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
        </div>
      </div>
    </MainLayout>
  );
}
