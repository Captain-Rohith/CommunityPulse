"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, User, Calendar, MapPin, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layouts/MainLayout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_EMAIL = "rohithvishwanath1789@gmail.com";

export default function AdminDashboard() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [pendingOrganizers, setPendingOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pending-events");

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (isLoaded && isSignedIn && user) {
        // Check if the user is the designated admin
        if (user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
          toast.error("Access Denied", {
            description:
              "You don't have permission to access the admin dashboard.",
          });
          router.push("/");
        }
      } else if (isLoaded && !isSignedIn) {
        router.push("/");
      }
    };

    checkAdminAccess();
  }, [isLoaded, isSignedIn, user, router]);

  // Fetch pending events
  useEffect(() => {
    const fetchPendingEvents = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        setLoading(true);
        const token = await getToken();

        const response = await axios.get(`${API_URL}/admin/events/pending`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const formattedEvents = response.data.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_date).toLocaleDateString(),
          startTime: new Date(event.start_date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTime: new Date(event.end_date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          location: event.location,
          description: event.description,
          category: event.category,
          type: event.type || "Free",
          organizer_id: event.organizer_id,
          image_path: event.image_path,
          created_at: new Date(event.created_at).toLocaleDateString(),
        }));

        setPendingEvents(formattedEvents);

        // Also fetch approved events
        const approvedResponse = await axios.get(
          `${API_URL}/events?approved_only=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const formattedApprovedEvents = approvedResponse.data.map(
          (event: any) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.start_date).toLocaleDateString(),
            startTime: new Date(event.start_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endTime: new Date(event.end_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            location: event.location,
            description: event.description,
            category: event.category,
            type: event.type || "Free",
            organizer_id: event.organizer_id,
            image_path: event.image_path,
            created_at: new Date(event.created_at).toLocaleDateString(),
          })
        );

        setApprovedEvents(formattedApprovedEvents);

        // Fetch users who aren't verified organizers
        const usersResponse = await axios.get(`${API_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const pendingOrganizersList = usersResponse.data.filter(
          (user: any) => !user.is_verified_organizer && !user.is_admin
        );

        setPendingOrganizers(pendingOrganizersList);
      } catch (err: any) {
        console.error("Error fetching admin data:", err);
        setError(err.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingEvents();
  }, [isLoaded, isSignedIn, getToken]);

  // Approve event
  const approveEvent = async (eventId: number) => {
    try {
      setLoading(true);
      const token = await getToken();

      await axios.put(
        `${API_URL}/admin/events/${eventId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      const approvedEvent = pendingEvents.find((event) => event.id === eventId);
      if (approvedEvent) {
        setPendingEvents(pendingEvents.filter((event) => event.id !== eventId));
        setApprovedEvents([...approvedEvents, approvedEvent]);
      }

      toast.success("Event Approved", {
        description: "The event has been approved successfully.",
      });
    } catch (err: any) {
      console.error("Error approving event:", err);
      toast.error("Error", {
        description: "Failed to approve event. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reject event
  const rejectEvent = async (eventId: number) => {
    try {
      setLoading(true);
      const token = await getToken();

      await axios.put(
        `${API_URL}/admin/events/${eventId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setPendingEvents(pendingEvents.filter((event) => event.id !== eventId));

      toast.info("Event Rejected", {
        description: "The event has been rejected and removed.",
      });
    } catch (err: any) {
      console.error("Error rejecting event:", err);
      toast.error("Error", {
        description: "Failed to reject event. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify organizer
  const verifyOrganizer = async (userId: number) => {
    try {
      setLoading(true);
      const token = await getToken();

      await axios.put(
        `${API_URL}/admin/users/${userId}/verify-organizer`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setPendingOrganizers(
        pendingOrganizers.filter((user) => user.id !== userId)
      );

      toast.success("Organizer Verified", {
        description: "The user has been verified as an organizer.",
      });
    } catch (err: any) {
      console.error("Error verifying organizer:", err);
      toast.error("Error", {
        description: "Failed to verify organizer. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => router.push("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending-events">
              Pending Events ({pendingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="approved-events">
              Approved Events ({approvedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="pending-organizers">
              Pending Organizers ({pendingOrganizers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-events">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="w-full">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending events to review
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEvents.map((event) => (
                  <Card key={event.id} className="w-full">
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>
                        Created on {event.created_at}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 mt-1" />
                          <div>
                            <div>{event.date}</div>
                            <div className="text-sm text-gray-500">
                              {event.startTime} - {event.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 mt-1" />
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{event.category}</Badge>
                            <Badge variant="outline">
                              {event.type === "Free"
                                ? "Free"
                                : `₹${event.type}`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectEvent(event.id)}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveEvent(event.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved-events">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="w-full">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : approvedEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No approved events
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedEvents.map((event) => (
                  <Card key={event.id} className="w-full">
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>
                        Created on {event.created_at}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 mt-1" />
                          <div>
                            <div>{event.date}</div>
                            <div className="text-sm text-gray-500">
                              {event.startTime} - {event.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 mt-1" />
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{event.category}</Badge>
                            <Badge variant="outline">
                              {event.type === "Free"
                                ? "Free"
                                : `₹${event.type}`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-organizers">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="w-full">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingOrganizers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending organizer verifications
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrganizers.map((user) => (
                  <Card key={user.id} className="w-full">
                    <CardHeader>
                      <CardTitle>{user.name}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>
                            Joined on{" "}
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => verifyOrganizer(user.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Verify as Organizer
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
