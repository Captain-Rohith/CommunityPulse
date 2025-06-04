"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Tag,
  Heart,
  HeartOff,
  Share2,
  Flag,
  Mail,
  Phone,
  User,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventMap } from "@/components/EventMap";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  start_date: string;
  end_date: string;
  registration_start: string;
  registration_end: string;
  image_path: string | null;
  organizer_id: number;
  is_approved: boolean;
  attendees_count: number;
  is_registered: boolean;
  organizer: {
    id: number;
    username: string;
    email: string;
    phone: string;
    is_verified_organizer: boolean;
  };
  likes_count: number;
  is_liked: boolean;
}

interface RegistrationStatus {
  status: "none" | "interested" | "registered";
  registration: {
    id: number;
    attendees: string[];
    number_of_attendees: number;
    registered_at: string;
  } | null;
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus | null>(null);
  const [attendees, setAttendees] = useState<string[]>([""]);
  const [numberOfAttendees, setNumberOfAttendees] = useState(1);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/events/${params.id}/details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch event details");
        }

        const data = await response.json();
        console.log("Event details:", {
          registration_start: new Date(
            data.registration_start
          ).toLocaleString(),
          registration_end: new Date(data.registration_end).toLocaleString(),
          current_time: new Date().toLocaleString(),
        });
        setEvent(data);
        setIsLiked(data.is_liked);
        setLikesCount(data.likes_count);

        // Fetch user details to check if they're an admin
        const userResponse = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setIsAdmin(userData.is_admin);
          setIsOrganizer(data.organizer_id === userData.id);
        }

        // Fetch registration status
        const statusResponse = await fetch(
          `${API_URL}/events/${params.id}/registration-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setRegistrationStatus(statusData);
          if (statusData.registration) {
            setAttendees(statusData.registration.attendees);
            setNumberOfAttendees(statusData.registration.number_of_attendees);
          }
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        toast.error("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (params.id && isSignedIn) {
      fetchEventDetails();
    }
  }, [params.id, getToken, isSignedIn]);

  const isRegistrationOpen = (event: Event) => {
    const now = new Date();
    const registrationStart = new Date(event.registration_start);
    const registrationEnd = new Date(event.registration_end);
    return now >= registrationStart && now <= registrationEnd;
  };

  const getRegistrationStatus = (event: Event) => {
    const now = new Date();
    const registrationStart = new Date(event.registration_start);
    const registrationEnd = new Date(event.registration_end);

    if (now < registrationStart) {
      return {
        isOpen: false,
        message: `Registration opens on ${formatDate(
          event.registration_start
        )} at ${formatTime(event.registration_start)}`,
      };
    }
    if (now > registrationEnd) {
      return {
        isOpen: false,
        message: "Registration period has ended",
      };
    }
    return {
      isOpen: true,
      message: "",
    };
  };

  const handleInterest = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to register for this event");
      return;
    }

    if (!event) return;

    const registrationStatus = getRegistrationStatus(event);
    if (!registrationStatus.isOpen) {
      toast.error(registrationStatus.message);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/events/${params.id}/interest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark interest");
      }

      const data = await response.json();
      setShowRegistrationDialog(true);

      // Refresh registration status
      const statusResponse = await fetch(
        `${API_URL}/events/${params.id}/registration-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setRegistrationStatus(statusData);
      }

      toast.success("Interest marked successfully!");
    } catch (error) {
      console.error("Error marking interest:", error);
      toast.error("Failed to mark interest");
    }
  };

  const handleConfirmRegistration = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to register for this event");
      return;
    }

    if (!event) return;

    const registrationStatus = getRegistrationStatus(event);
    if (!registrationStatus.isOpen) {
      toast.error(registrationStatus.message);
      return;
    }

    // Filter out empty attendee names
    const filteredAttendees = attendees.filter((name) => name.trim() !== "");

    // Validate attendees
    if (filteredAttendees.length === 0) {
      toast.error("Please add at least one attendee");
      return;
    }

    if (filteredAttendees.length > 10) {
      toast.error("Maximum 10 attendees allowed per registration");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/events/${params.id}/confirm-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attendees: filteredAttendees,
            number_of_attendees: filteredAttendees.length,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to confirm registration");
      }

      setShowRegistrationDialog(false);

      // Refresh registration status
      const statusResponse = await fetch(
        `${API_URL}/events/${params.id}/registration-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setRegistrationStatus(statusData);
      }

      toast.success("Successfully registered for event!");
    } catch (error) {
      console.error("Error confirming registration:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to confirm registration"
      );
    }
  };

  const handleUnregister = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/events/${params.id}/cancel-registration`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel registration");
      }

      // Refresh registration status
      const statusResponse = await fetch(
        `${API_URL}/events/${params.id}/registration-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setRegistrationStatus(statusData);
      }

      setShowUnregisterConfirm(false);
      toast.success("Successfully unregistered from event");
    } catch (error) {
      console.error("Error unregistering:", error);
      toast.error("Failed to unregister from event");
    }
  };

  const handleDeleteEvent = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/events/${params.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleLikeToggle = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to like this event");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/events/${params.id}/like`, {
        method: isLiked ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update like status");
      }

      // Fetch updated event details to get the current like count
      const eventResponse = await fetch(
        `${API_URL}/events/${params.id}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setIsLiked(eventData.is_liked);
        setLikesCount(eventData.likes_count);
        toast.success(isLiked ? "Event unliked" : "Event liked");
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      toast.error("Failed to update like status");
    }
  };

  const handleShare = async (platform: string) => {
    const eventUrl = window.location.href;
    const text = `Check out this event: ${event?.title}`;

    const shareUrls: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(eventUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        eventUrl
      )}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        eventUrl
      )}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(
        `${text}\n${eventUrl}`
      )}`,
    };

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(eventUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy link");
      }
      return;
    }

    window.open(shareUrls[platform], "_blank", "width=600,height=400");
    setShowShareDialog(false);
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/events/${params.id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      setShowReportDialog(false);
      setReportReason("");
      toast.success("Report submitted successfully");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAttendeesChange = (index: number, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = value;
    setAttendees(newAttendees);
  };

  const addAttendee = () => {
    if (attendees.length >= 10) {
      toast.error("Maximum 10 attendees allowed per registration");
      return;
    }
    setAttendees([...attendees, ""]);
    setNumberOfAttendees(numberOfAttendees + 1);
  };

  const removeAttendee = (index: number) => {
    if (attendees.length <= 1) {
      toast.error("At least one attendee is required");
      return;
    }
    const newAttendees = attendees.filter((_, i) => i !== index);
    setAttendees(newAttendees);
    setNumberOfAttendees(numberOfAttendees - 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with cover image */}
      <div className="relative w-full">
        {event?.image_path ? (
          <div className="h-[300px] md:h-[500px] relative w-full">
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent z-10" />
            <img
              src={`${API_URL}/${event?.image_path}`}
              alt={event?.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-32 z-10" />
          </div>
        ) : (
          <div className="h-[200px] w-full bg-gradient-to-r from-primary/10 to-primary/5" />
        )}

        {/* Back button */}
        <Button
          variant="ghost"
          className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={() => router.back()}
        >
          ← Back
        </Button>
      </div>

      {/* Main content with responsive layout */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Left column - full width on mobile, 80% on desktop */}
          <div className="w-full lg:w-[80%] space-y-4 lg:space-y-8">
            <div className="bg-background rounded-xl shadow-sm p-4 md:p-6 lg:p-8 space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
                    {event?.title}
                  </h1>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowShareDialog(true)}
                      className="hover:bg-primary/10"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLikeToggle}
                      className={`hover:bg-primary/10 ${
                        isLiked ? "text-red-500" : ""
                      }`}
                    >
                      {isLiked ? (
                        <Heart className="h-5 w-5 fill-current" />
                      ) : (
                        <HeartOff className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowReportDialog(true)}
                      className="hover:bg-primary/10"
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Category and likes */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    <Tag className="w-4 h-4 mr-1" />
                    {event?.category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {likesCount} likes
                  </span>
                </div>
              </div>

              {/* Organizer Information */}
              <div className="border-t pt-4 mt-4">
                <h2 className="text-xl font-semibold mb-4">Event Organizer</h2>
                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="font-semibold truncate min-w-0">
                            {event?.organizer.username}
                          </h3>
                          {event?.organizer.is_verified_organizer && (
                            <span className="inline-flex items-center bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                              Verified Organizer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Mail className="h-4 w-4 shrink-0 mt-1" />
                          <span className="break-all">
                            {event?.organizer.email}
                          </span>
                        </div>
                        {event?.organizer.phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 shrink-0 mt-1" />
                            <span className="break-all">
                              {event?.organizer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="prose max-w-none">
                <h2 className="text-2xl font-semibold">About this event</h2>
                <p className="text-muted-foreground leading-relaxed break-words">
                  {event?.description}
                </p>
              </div>
            </div>

            {/* Location section */}
            <div className="bg-background rounded-xl shadow-sm p-4 md:p-6 lg:p-8 space-y-4">
              <h2 className="text-2xl font-semibold">Location</h2>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 shrink-0 mt-1" />
                <span className="text-lg break-words">{event?.location}</span>
              </div>
              <div className="mt-4 rounded-lg overflow-hidden border shadow-sm">
                <EventMap
                  location={event?.location || ""}
                  className="w-full h-[300px] md:h-[400px]"
                />
              </div>
            </div>
          </div>

          {/* Right column - full width on mobile, 20% on desktop */}
          <div className="w-full lg:w-[20%]">
            <div className="sticky top-4 space-y-4">
              <Card className="shadow-sm border-0 bg-background/60 backdrop-blur-sm">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="pb-6 border-b">
                    <div className="text-3xl font-bold text-primary break-words">
                      {event?.attendees_count}
                      <span className="text-base font-normal text-muted-foreground ml-2">
                        attendees
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Event Schedule</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 mt-0.5 text-primary" />
                          <div>
                            <div className="font-medium">Date</div>
                            <div className="text-muted-foreground">
                              {formatDate(event?.start_date || "")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 mt-0.5 text-primary" />
                          <div>
                            <div className="font-medium">Time</div>
                            <div className="text-muted-foreground">
                              {formatTime(event?.start_date || "")} -{" "}
                              {formatTime(event?.end_date || "")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold">Registration Period</h3>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(event?.registration_start || "")} -{" "}
                        {formatDate(event?.registration_end || "")}
                      </div>
                      {event && !getRegistrationStatus(event).isOpen && (
                        <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                          {getRegistrationStatus(event).message}
                        </div>
                      )}
                    </div>

                    {(isOrganizer || isAdmin) && (
                      <div className="space-y-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            router.push(`/events/${params.id}/edit`)
                          }
                        >
                          Edit Event
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Delete Event
                        </Button>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      {registrationStatus?.status === "registered" ? (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-2">
                              Your Registration
                            </h3>
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                Registered Attendees:{" "}
                                {
                                  registrationStatus.registration
                                    ?.number_of_attendees
                                }
                              </p>
                            </div>
                            <Button
                              onClick={() => setShowUnregisterConfirm(true)}
                              variant="destructive"
                              className="w-full mt-4"
                              size="sm"
                            >
                              Unregister
                            </Button>
                          </div>
                        </div>
                      ) : registrationStatus?.status === "interested" ? (
                        <Button
                          onClick={() => setShowRegistrationDialog(true)}
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={
                            !event || !getRegistrationStatus(event).isOpen
                          }
                        >
                          Complete Registration
                        </Button>
                      ) : (
                        <Button
                          onClick={handleInterest}
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={
                            !event || !getRegistrationStatus(event).isOpen
                          }
                        >
                          I'm Interested
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-[425px] p-4 md:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
            <DialogDescription>
              Share this event on your favorite platform
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center md:justify-center gap-4 md:gap-6 py-6">
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-3 hover:bg-blue-50 hover:text-blue-600 transition-colors w-full md:w-auto"
              onClick={() => handleShare("twitter")}
            >
              <Twitter className="h-6 w-6" />
              <span className="sr-only">Share on Twitter</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-3 hover:bg-blue-900 hover:text-blue-50 transition-colors w-full md:w-auto"
              onClick={() => handleShare("facebook")}
            >
              <Facebook className="h-6 w-6" />
              <span className="sr-only">Share on Facebook</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-3 hover:bg-blue-700 hover:text-blue-50 transition-colors w-full md:w-auto"
              onClick={() => handleShare("linkedin")}
            >
              <Linkedin className="h-6 w-6" />
              <span className="sr-only">Share on LinkedIn</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-3 hover:bg-green-50 hover:text-green-600 transition-colors w-full md:w-auto"
              onClick={() => handleShare("whatsapp")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M12.001 2c5.523 0 10 4.477 10 10s-4.477 10-10 10a9.954 9.954 0 0 1-5.03-1.355L2.005 22l1.352-4.968A9.954 9.954 0 0 1 2.001 12c0-5.523 4.477-10 10-10ZM8.593 7.3l-.2.008a1.46 1.46 0 0 0-.456.123 1.777 1.777 0 0 0-.243.17c-.124.097-.222.204-.314.338a3.341 3.341 0 0 0-.73 2.092c.002.49.105.967.307 1.418.313.708.816 1.447 1.51 2.142.14.14.294.28.456.419 1.07.907 2.318 1.627 3.682 2.131.441.164.928.3 1.421.392.49.091.995.151 1.504.148.465-.004.93-.067 1.37-.193.41-.116.813-.3 1.125-.576.17-.152.324-.337.42-.544.09-.193.13-.41.141-.627v-.602c-.01-.186-.07-.356-.192-.487-.127-.136-.272-.223-.423-.291-.157-.071-.462-.182-.962-.374-.481-.185-.834-.325-1.057-.417a1.114 1.114 0 0 0-.45-.097c-.17.004-.34.06-.48.167-.14.107-.47.437-.997.99-.115.122-.257.18-.421.175a.943.943 0 0 1-.305-.052c-.215-.077-.518-.2-.91-.37a8.294 8.294 0 0 1-1.155-.654 6.67 6.67 0 0 1-1.08-.955c-.112-.122-.23-.254-.332-.391a1.003 1.003 0 0 1-.208-.516.997.997 0 0 1 .148-.56c.124-.182.35-.405.677-.668.126-.102.186-.23.181-.385-.005-.134-.096-.344-.275-.63-.193-.31-.407-.647-.641-1.013-.19-.3-.345-.51-.463-.63-.127-.13-.274-.193-.44-.193Z" />
              </svg>
              <span className="sr-only">Share on WhatsApp</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-3 hover:bg-gray-100 transition-colors relative w-full md:w-auto"
              onClick={() => handleShare("copy")}
            >
              {copied ? (
                <Check className="h-6 w-6 text-green-500" />
              ) : (
                <Copy className="h-6 w-6" />
              )}
              <span className="sr-only">Copy Link</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={
          showRegistrationDialog && event && getRegistrationStatus(event).isOpen
        }
        onOpenChange={(open) => {
          if (!event || !getRegistrationStatus(event).isOpen) {
            return;
          }
          setShowRegistrationDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Complete Registration
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please provide the names of all attendees. You can add up to 10
              attendees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {attendees.map((attendee, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label
                    htmlFor={`attendee-${index}`}
                    className="text-sm font-medium"
                  >
                    Attendee {index + 1}
                  </Label>
                  <Input
                    id={`attendee-${index}`}
                    value={attendee}
                    onChange={(e) =>
                      handleAttendeesChange(index, e.target.value)
                    }
                    placeholder="Enter attendee name"
                    className="mt-1"
                    required
                  />
                </div>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-6"
                    onClick={() => removeAttendee(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {attendees.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addAttendee}
                className="w-full"
              >
                Add Another Attendee
              </Button>
            )}
          </div>
          <div className="flex justify-end gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRegistrationDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRegistration}>
              Confirm Registration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUnregisterConfirm}
        onOpenChange={setShowUnregisterConfirm}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Confirm Unregistration
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to unregister from this event? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowUnregisterConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnregister}>
              Unregister
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this event? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Report Event</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full px-3 py-2 border rounded-md h-32"
              placeholder="Enter your reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReport}>
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
