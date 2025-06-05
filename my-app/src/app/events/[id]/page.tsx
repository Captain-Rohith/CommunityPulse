"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
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
  Facebook,
  Linkedin,
  Copy,
  Check,
  Eye,
  ArrowLeft,
  User2,
  X,
  PlusCircle,
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
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layouts/MainLayout";
import { SignInButton } from "@clerk/nextjs";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { Separator } from "@/components/ui/separator";

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
  type: string;
  views: number;
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
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus | null>(null);
  const [attendees, setAttendees] = useState<
    Array<{ name: string; age: string; phone: string }>
  >([{ name: "", age: "", phone: "" }]);
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
  const [error, setError] = useState<string | null>(null);

  // Check for registration action in URL
  useEffect(() => {
    if (
      searchParams?.get("action") === "register" &&
      registrationStatus?.status === "interested"
    ) {
      setShowRegistrationDialog(true);
    }
  }, [searchParams, registrationStatus]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/events/${params.id}/details`, {
          headers,
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

        // Only fetch user details and registration status if signed in
        if (isSignedIn) {
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
              setAttendees(
                statusData.registration.attendees.map((name: string) => ({
                  name,
                  age: "",
                  phone: "",
                }))
              );
              setNumberOfAttendees(statusData.registration.number_of_attendees);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        toast.error("Failed to load event details");
        setError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
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

    // Add buffer time for timezone differences
    const bufferTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const registrationStartWithBuffer = new Date(
      registrationStart.getTime() - bufferTime
    );
    const registrationEndWithBuffer = new Date(
      registrationEnd.getTime() + bufferTime
    );

    // Convert all dates to UTC for consistent comparison
    const nowUTC = new Date(now.toISOString());
    const startUTC = new Date(registrationStartWithBuffer.toISOString());
    const endUTC = new Date(registrationEndWithBuffer.toISOString());

    console.log("Registration status check:", {
      now: nowUTC.toISOString(),
      registrationStart: registrationStart.toISOString(),
      registrationEnd: registrationEnd.toISOString(),
      registrationStartWithBuffer: startUTC.toISOString(),
      registrationEndWithBuffer: endUTC.toISOString(),
    });

    if (nowUTC < startUTC) {
      return {
        isOpen: false,
        message: `Registration opens on ${formatDate(
          event.registration_start
        )} at ${formatTime(event.registration_start)}`,
      };
    }
    if (nowUTC > endUTC) {
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
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to mark interest");
      }

      const data = await response.json();

      // Update registration status immediately
      setRegistrationStatus({
        status: "interested",
        registration: {
          id: data.registration_id,
          attendees: [user?.username || ""],
          number_of_attendees: 1,
          registered_at: new Date().toISOString(),
        },
      });

      toast.success("Interest marked successfully!");
    } catch (error) {
      console.error("Error marking interest:", error);
      toast.error("Failed to mark interest");
    }
  };

  const handleConfirmRegistration = async () => {
    try {
      // Validate attendee data
      const isValid = attendees.every(
        (attendee) =>
          attendee.name.trim() &&
          /^\d+$/.test(attendee.age) &&
          parseInt(attendee.age) >= 2 &&
          parseInt(attendee.age) <= 120 &&
          /^\d{10}$/.test(attendee.phone.replace(/[\s\-\(\)]/g, ""))
      );

      if (!isValid) {
        toast.error(
          "Please ensure all attendees have valid details: Name, Age (2-120), and 10-digit phone number"
        );
        return;
      }

      const formattedAttendees = attendees.map((attendee) => ({
        name: attendee.name.trim(),
        age: parseInt(attendee.age),
        phone: attendee.phone.trim(),
      }));

      const token = await getToken();
      const response = await fetch(
        `${API_URL}/events/${event?.id}/confirm-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            number_of_attendees: numberOfAttendees,
            attendees: formattedAttendees,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to confirm registration");
      }

      // Update registration status immediately
      setRegistrationStatus({
        status: "registered",
        registration: {
          id: Date.now(), // Temporary ID until refresh
          attendees: formattedAttendees.map((a) => a.name),
          number_of_attendees: numberOfAttendees,
          registered_at: new Date().toISOString(),
        },
      });

      // Close the dialog
      setShowRegistrationDialog(false);

      // Remove the action parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      toast.success("Successfully registered for the event!");
    } catch (error) {
      console.error("Error confirming registration:", error);
      toast.error("Failed to confirm registration");
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
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <Button
              variant="ghost"
              className="mb-6 text-gray-600 hover:text-purple-600 transition-colors"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center justify-center min-h-[60vh]">
              <LoadingAnimation />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <Button
              variant="ghost"
              className="mb-6 text-gray-600 hover:text-purple-600 transition-colors"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Error Loading Event
              </h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
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

  const handleAttendeesChange = (
    index: number,
    field: "name" | "age" | "phone",
    value: string
  ) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
  };

  const addAttendee = () => {
    if (attendees.length >= 10) {
      toast.error("Maximum 10 attendees allowed per registration");
      return;
    }
    setAttendees([...attendees, { name: "", age: "", phone: "" }]);
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

  const renderRegistrationForm = () => (
    <div className="space-y-4">
      {attendees.map((attendee, index) => (
        <div
          key={index}
          className="space-y-4 p-4 bg-gray-50 rounded-lg relative"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${index}`}>Name</Label>
              <Input
                id={`name-${index}`}
                value={attendee.name}
                onChange={(e) =>
                  handleAttendeesChange(index, "name", e.target.value)
                }
                placeholder="Enter attendee name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`age-${index}`}>Age (2-120)</Label>
              <Input
                id={`age-${index}`}
                type="number"
                value={attendee.age}
                onChange={(e) =>
                  handleAttendeesChange(index, "age", e.target.value)
                }
                placeholder="Enter age"
                min="2"
                max="120"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`phone-${index}`}>Phone Number (10 digits)</Label>
              <Input
                id={`phone-${index}`}
                value={attendee.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleAttendeesChange(index, "phone", value);
                }}
                placeholder="Enter 10-digit phone number"
                required
                pattern="[0-9]{10}"
              />
            </div>
          </div>
          {attendees.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              onClick={() => removeAttendee(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={addAttendee}
          disabled={attendees.length >= 10}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Another Attendee
        </Button>
        <p className="text-sm text-gray-500">{attendees.length}/10 attendees</p>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-32 z-10" />
            </div>
          ) : (
            <div className="h-[200px] w-full bg-gradient-to-r from-purple-100 to-pink-50" />
          )}

          {/* Back button */}
          <Button
            variant="ghost"
            className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-600 hover:text-purple-600"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main content with responsive layout */}
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 -mt-16 relative z-20">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Left column - full width on mobile, 80% on desktop */}
            <div className="w-full lg:w-[80%] space-y-4 lg:space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 lg:p-8 space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h1 className="text-4xl font-bold text-black">
                      {event.title}
                    </h1>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={cn(
                          "text-sm px-3 py-1.5 rounded-full",
                          event.type === "Free"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                        )}
                      >
                        {event.type}
                      </span>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Eye className="h-4 w-4 text-purple-500" />
                        <span>{event.views} views</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                          event.category === "Garage Sale"
                            ? "bg-orange-100 text-orange-800"
                            : event.category === "Sports Match"
                            ? "bg-blue-100 text-blue-800"
                            : event.category === "Community Class"
                            ? "bg-purple-100 text-purple-800"
                            : event.category === "Volunteer"
                            ? "bg-green-100 text-green-800"
                            : event.category === "Exhibition"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-pink-100 text-pink-800"
                        )}
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        {event?.category}
                      </span>
                      <span className="text-sm text-gray-600">
                        {likesCount} likes
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "hover:bg-gray-100",
                          isLiked
                            ? "text-pink-500 hover:text-pink-600"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                        onClick={() => {
                          if (isSignedIn) {
                            handleLikeToggle();
                          } else {
                            toast.error("Please sign in to like this event");
                          }
                        }}
                      >
                        {isLiked ? (
                          <Heart className="h-5 w-5 fill-current" />
                        ) : (
                          <Heart className="h-5 w-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        onClick={() => setShowShareDialog(true)}
                      >
                        <Share2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        onClick={() => {
                          if (isSignedIn) {
                            setShowReportDialog(true);
                          } else {
                            toast.error("Please sign in to report this event");
                          }
                        }}
                      >
                        <Flag className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Organizer Information */}
                <div className="border-t pt-4 mt-4">
                  <h2 className="text-xl font-semibold mb-4">
                    Event Organizer
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-100 p-3 rounded-full shrink-0">
                        <User2 className="h-6 w-6 text-purple-500" />
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
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 shrink-0 mt-1 text-purple-500" />
                            <span className="break-all">
                              {event?.organizer.email}
                            </span>
                          </div>
                          {event?.organizer.phone && (
                            <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 shrink-0 mt-1 text-purple-500" />
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
                  <h2 className="text-2xl font-semibold text-gray-800">
                    About this event
                  </h2>
                  <p className="text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                    {event?.description}
                  </p>
                </div>
              </div>

              {/* Location section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 lg:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Location
                </h2>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-5 h-5 shrink-0 mt-1 text-purple-500" />
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
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-4 md:p-6 space-y-6">
                    <div className="pb-6 border-b">
                      <div className="text-3xl font-bold text-purple-600 break-words">
                        {event?.attendees_count}
                        <span className="text-base font-normal text-gray-600 ml-2">
                          attendees
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-3 text-gray-800">
                          Event Schedule
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 mt-0.5 text-purple-500" />
                            <div>
                              <div className="font-medium text-gray-800">
                                Date
                              </div>
                              <div className="text-gray-600">
                                {formatDate(event?.start_date || "")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 mt-0.5 text-purple-500" />
                            <div>
                              <div className="font-medium text-gray-800">
                                Time
                              </div>
                              <div className="text-gray-600">
                                {formatTime(event?.start_date || "")} -{" "}
                                {formatTime(event?.end_date || "")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800">
                          Registration Period
                        </h3>
                        <div className="text-sm text-gray-600">
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
                            className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                            onClick={() =>
                              router.push(`/events/${params.id}/edit`)
                            }
                          >
                            Edit Event
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                            onClick={() =>
                              router.push(`/dashboard/${params.id}`)
                            }
                          >
                            View Dashboard
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
                              <h3 className="font-semibold mb-2 text-gray-800">
                                Your Registration
                              </h3>
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <p className="text-sm text-gray-600">
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
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            disabled={
                              !event || !getRegistrationStatus(event).isOpen
                            }
                          >
                            Complete Registration
                          </Button>
                        ) : isSignedIn ? (
                          <Button
                            onClick={handleInterest}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            disabled={
                              !event || !getRegistrationStatus(event).isOpen
                            }
                          >
                            I'm Interested
                          </Button>
                        ) : (
                          <SignInButton>
                            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                              Sign in to Register
                            </Button>
                          </SignInButton>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Dialog */}
        <Dialog
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Complete Registration</DialogTitle>
              <DialogDescription>
                Please provide details for all attendees. All fields are
                required.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">{renderRegistrationForm()}</div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRegistrationDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRegistration}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Confirm Registration
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unregister Confirmation Dialog */}
        <Dialog
          open={showUnregisterConfirm}
          onOpenChange={setShowUnregisterConfirm}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Unregistration</DialogTitle>
              <DialogDescription>
                Are you sure you want to unregister from this event? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
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

        {/* Delete Event Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Event</DialogTitle>
              <DialogDescription>
                Please provide details about why you're reporting this event.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="report-reason">Reason</Label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md"
                rows={4}
                placeholder="Please describe why you're reporting this event..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReport}
                disabled={!reportReason.trim()}
              >
                Submit Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Event</DialogTitle>
              <DialogDescription>
                Share this event with your network
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4 py-4">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="w-5 h-5" />
                Facebook
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare("linkedin")}
              >
                <Linkedin className="w-5 h-5" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleShare("copy")}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
                Copy Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
