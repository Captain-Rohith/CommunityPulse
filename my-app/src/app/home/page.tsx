"use client";
import Image from "next/image";
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
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Calendar,
  Users,
  MapPin,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Ticket,
  Heart,
  History,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker, DayClickEventHandler } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { EmptyRegisteredEvents } from "@/components/EmptyRegisteredEvents";

// API base URL
const API_URL = "http://localhost:8000";
const ADMIN_EMAIL = "rohithvishwanath1789@gmail.com";

type SortOption =
  | "date-asc"
  | "date-desc"
  | "title-asc"
  | "title-desc"
  | "popularity";

// Update the FilterState interface
interface FilterState {
  categories: string[];
  showNearby: boolean;
  showMyEvents: boolean;
  dateRange: DateRange | undefined;
  sortBy: SortOption;
}

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
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
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    showNearby: false,
    showMyEvents: false,
    dateRange: undefined,
    sortBy: "date-desc", // Default sort by date descending
  });
  const { user } = useUser();

  // Add a loading state for initial page load
  const [pageLoading, setPageLoading] = useState(true);

  const [isScrolled, setIsScrolled] = useState(false);

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
            type: event.type || "Free",
            views: event.views || 0,
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
            type: event.type || "Free",
            views: event.views || 0,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
            status: "interested",
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
        params.append("upcoming", "true");
        params.append("approved_only", "true");

        // Make the API request
        const response = await axios.get(
          `${API_URL}/events?${params.toString()}`
        );

        // Format the events data
        const formattedAllEvents = response.data.map((event: any) => {
          // Check if this event is in the interestedEvents list
          const isInterested = interestedEvents.some((e) => e.id === event.id);

          return {
            id: event.id,
            title: event.title,
            date: new Date(event.start_date).toISOString().split("T")[0],
            enddate: new Date(event.end_date).toISOString().split("T")[0],
            location: event.location,
            startTime: new Date(event.start_date).toTimeString().slice(0, 5),
            endTime: new Date(event.end_date).toTimeString().slice(0, 5),
            description: event.description,
            category: event.category,
            type: event.type || "Free",
            views: event.views || 0,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
            organizer_id: event.organizer_id,
            organizer: event.organizer,
            status: isInterested ? "interested" : undefined,
          };
        });

        // Filter out events that user is already registered for or interested in
        const filteredEvents = formattedAllEvents.filter(
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
  }, [registeredEvents, interestedEvents]);

  // Update sort function to handle undefined dates
  const sortEvents = (events: any[]) => {
    if (!events) return [];

    return [...events].sort((a, b) => {
      switch (filters.sortBy) {
        case "date-asc":
          const dateA = new Date(a.date || a.start_date).getTime();
          const dateB = new Date(b.date || b.start_date).getTime();
          return dateA - dateB;
        case "date-desc":
          const dateDescA = new Date(a.date || a.start_date).getTime();
          const dateDescB = new Date(b.date || b.start_date).getTime();
          return dateDescB - dateDescA;
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title-desc":
          return (b.title || "").localeCompare(a.title || "");
        case "popularity":
          return (
            (b.attendees_count || b.attendees || 0) -
            (a.attendees_count || a.attendees || 0)
          );
        default:
          return 0;
      }
    });
  };

  // Update the useEffect for filtering to include sorting
  useEffect(() => {
    if (!searchTerm.trim()) {
      let filteredResults = allEvents;

      // Apply existing filters
      if (filters.categories.length > 0) {
        filteredResults = filteredResults.filter((event) =>
          filters.categories.includes(event.category)
        );
      }

      if (filters.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = filters.dateRange.to
          ? new Date(filters.dateRange.to)
          : fromDate;
        toDate.setHours(23, 59, 59, 999);

        filteredResults = filteredResults.filter((event) => {
          const eventDate = new Date(event.date);
          return eventDate >= fromDate && eventDate <= toDate;
        });
      }

      // Apply sorting
      filteredResults = sortEvents(filteredResults);

      setFilteredEvents(filteredResults);
      return;
    }

    // Search with filters and sorting
    let searchResults = allEvents.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower) ||
        event.category?.toLowerCase().includes(searchLower);

      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(event.category);

      let matchesDateRange = true;
      if (filters.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = filters.dateRange.to
          ? new Date(filters.dateRange.to)
          : fromDate;
        toDate.setHours(23, 59, 59, 999);

        const eventDate = new Date(event.date);
        matchesDateRange = eventDate >= fromDate && eventDate <= toDate;
      }

      return matchesSearch && matchesCategory && matchesDateRange;
    });

    // Apply sorting to search results
    searchResults = sortEvents(searchResults);

    setFilteredEvents(searchResults);
  }, [searchTerm, filters, allEvents]);

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

      // Find the event in filteredEvents
      const eventToMove = filteredEvents.find((event) => event.id === eventId);

      if (eventToMove) {
        // Format the event for interested events list
        const formattedEvent = {
          ...eventToMove,
          status: "interested", // Add status field
        };

        // Remove from filtered events
        setFilteredEvents(
          filteredEvents.filter((event) => event.id !== eventId)
        );

        // Add to interested events
        setInterestedEvents([...interestedEvents, formattedEvent]);
      }
    } catch (error) {
      console.error("Error marking interest:", error);
      alert("Failed to mark interest in event");
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

  // Fetch nearby events
  useEffect(() => {
    const fetchNearbyEvents = async () => {
      try {
        setLoadingNearby(true);
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          }
        );

        const { latitude, longitude } = position.coords;
        console.log("User coordinates:", { latitude, longitude });

        const response = await axios.get(`${API_URL}/events/nearby`, {
          params: {
            latitude: latitude,
            longitude: longitude,
            max_distance: 10.0,
          },
        });

        console.log("Nearby events response:", response.data);

        const formattedNearbyEvents = response.data.map((event: any) => {
          // Check if this event is in the interestedEvents list
          const isInterested = interestedEvents.some(
            (e: { id: number }) => e.id === event.id
          );

          return {
            id: event.id,
            title: event.title,
            date: new Date(event.start_date).toISOString().split("T")[0],
            enddate: new Date(event.end_date).toISOString().split("T")[0],
            location: event.location,
            startTime: new Date(event.start_date).toTimeString().slice(0, 5),
            endTime: new Date(event.end_date).toTimeString().slice(0, 5),
            description: event.description,
            category: event.category,
            type: event.type || "Free",
            views: event.views || 0,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
            distance: event.distance,
            status: isInterested ? "interested" : undefined,
          };
        });

        setNearbyEvents(formattedNearbyEvents);
      } catch (error: any) {
        console.error("Error fetching nearby events:", error);
        if (error.name === "GeolocationPositionError") {
          console.error("Geolocation error:", error.message);
        } else if (error.response) {
          console.error("API error:", error.response.data);
        }
      } finally {
        setLoadingNearby(false);
      }
    };

    fetchNearbyEvents();
  }, []);

  // Update the applyFilter function to use Clerk ID
  const applyFilter = (events: any[]) => {
    const { user } = useUser();
    if (!events) return [];

    let filteredEvents = [...events];

    // Log user and event data for debugging
    if (filters.showMyEvents) {
      console.log("Current user Clerk ID:", user?.id);
      console.log(
        "Events with organizer data:",
        events.map((e) => ({
          id: e.id,
          title: e.title,
          organizerClerkId: e.organizer?.clerk_id,
        }))
      );
    }

    // Apply category filters
    if (filters.categories.length > 0) {
      filteredEvents = filteredEvents.filter((event) =>
        filters.categories.includes(event.category)
      );
    }

    // Apply my events filter - match by Clerk ID
    if (filters.showMyEvents && user?.id) {
      filteredEvents = filteredEvents.filter(
        (event) => event.organizer?.clerk_id === user.id
      );
    }

    // Apply nearby filter
    if (filters.showNearby) {
      const nearbyIds = new Set(nearbyEvents.map((e) => e.id));
      filteredEvents = filteredEvents.filter((event) =>
        nearbyIds.has(event.id)
      );
    }

    return filteredEvents;
  };

  // Update the initial data fetching useEffect
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setPageLoading(true);
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

        // Fetch nearby events
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          }
        );

        const { latitude, longitude } = position.coords;
        const nearbyResponse = await fetch(
          `${API_URL}/events/nearby?latitude=${latitude}&longitude=${longitude}&max_distance=10.0`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );

        // Process all responses
        if (
          registeredResponse.ok &&
          interestedResponse.ok &&
          nearbyResponse.ok
        ) {
          const [registeredData, interestedData, nearbyData] =
            await Promise.all([
              registeredResponse.json(),
              interestedResponse.json(),
              nearbyResponse.json(),
            ]);

          // Format and set registered events
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
            type: event.type || "Free",
            views: event.views || 0,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
          }));

          // Format and set interested events
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
            type: event.type || "Free",
            views: event.views || 0,
            attendees: event.attendees_count,
            image_path: event.image_path,
            is_approved: event.is_approved,
            status: "interested",
          }));

          // Format and set nearby events
          const formattedNearbyEvents = nearbyData.map((event: any) => {
            // Check if this event is in the interestedEvents list
            const isInterested = interestedData.some(
              (e: { id: number }) => e.id === event.id
            );

            return {
              id: event.id,
              title: event.title,
              date: new Date(event.start_date).toISOString().split("T")[0],
              enddate: new Date(event.end_date).toISOString().split("T")[0],
              location: event.location,
              startTime: new Date(event.start_date).toTimeString().slice(0, 5),
              endTime: new Date(event.end_date).toTimeString().slice(0, 5),
              description: event.description,
              category: event.category,
              type: event.type || "Free",
              views: event.views || 0,
              attendees: event.attendees_count,
              image_path: event.image_path,
              is_approved: event.is_approved,
              distance: event.distance,
              status: isInterested ? "interested" : undefined,
            };
          });

          setRegisteredEvents(formattedRegistered);
          setInterestedEvents(formattedInterested);
          setNearbyEvents(formattedNearbyEvents);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    if (isSignedIn) {
      fetchInitialData();
    } else {
      setPageLoading(false);
    }
  }, [isSignedIn, getToken]);

  // Add scroll listener for header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pageLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingAnimation />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
        <main className="flex-grow pt-24 pb-12 container mx-auto px-4">
          {/* Hero Section */}
          <div className="mb-12 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
              Discover Local Events
            </h1>
            <p className="text-lg text-gray-600">
              Connect with your community through exciting events, from garage
              sales to festivals.
            </p>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-12 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search events by title, location, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex items-center gap-2 border text-gray-600 hover:text-purple-600 hover:border-purple-300 rounded-full px-4 py-2 transition-all duration-200",
                        filters.categories.length > 0
                          ? "border-purple-300 bg-purple-50 text-purple-600"
                          : "border-gray-200"
                      )}
                    >
                      <Filter size={16} />
                      <span>Filters</span>
                      {filters.categories.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-4 bg-white border border-gray-100 rounded-xl shadow-xl"
                    align="end"
                  >
                    <div className="space-y-4">
                      <h4 className="font-medium leading-none">
                        Filter Events
                      </h4>
                      <Separator />

                      {/* Date Range Filter */}
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium">Date Range</h5>
                          {filters.dateRange && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  dateRange: undefined,
                                }))
                              }
                            >
                              Clear dates
                            </Button>
                          )}
                        </div>
                        <DateRangePicker
                          date={filters.dateRange}
                          onDateChange={(dateRange) => {
                            setFilters((prev) => ({
                              ...prev,
                              dateRange,
                            }));
                          }}
                        />
                      </div>

                      <Separator />

                      {/* Existing Category Filters */}
                      <div>
                        <h5 className="mb-2 font-medium">Categories</h5>
                        <div className="ml-2 space-y-2">
                          {[
                            "Garage Sale",
                            "Sports Match",
                            "Community Class",
                            "Volunteer",
                            "Exhibition",
                            "Festival",
                          ].map((cat) => (
                            <div
                              key={cat}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`category-${cat}`}
                                checked={filters.categories.includes(cat)}
                                onCheckedChange={(checked) => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    categories: checked
                                      ? [...prev.categories, cat]
                                      : prev.categories.filter(
                                          (c) => c !== cat
                                        ),
                                  }));
                                }}
                              />
                              <label
                                htmlFor={`category-${cat}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {cat}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Existing Other Filters */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="nearby"
                            checked={filters.showNearby}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => ({
                                ...prev,
                                showNearby: checked as boolean,
                              }));
                            }}
                          />
                          <label
                            htmlFor="nearby"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Nearby Events
                          </label>
                        </div>

                        <SignedIn>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="my-events"
                              checked={filters.showMyEvents}
                              onCheckedChange={(checked) => {
                                setFilters((prev) => ({
                                  ...prev,
                                  showMyEvents: checked as boolean,
                                }));
                              }}
                            />
                            <label
                              htmlFor="my-events"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Events I'm Organizing
                            </label>
                          </div>
                        </SignedIn>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-2 hover:bg-gray-50 hover:border-[#9C5789] transition-all"
                    >
                      <ArrowUpDown size={16} className="text-[#9C5789]" />
                      {filters.sortBy === "date-desc" && "Latest"}
                      {filters.sortBy === "date-asc" && "Oldest"}
                      {filters.sortBy === "title-asc" && "A-Z"}
                      {filters.sortBy === "title-desc" && "Z-A"}
                      {filters.sortBy === "popularity" && "Popular"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, sortBy: "date-desc" }))
                      }
                    >
                      Latest First
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, sortBy: "date-asc" }))
                      }
                    >
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, sortBy: "title-asc" }))
                      }
                    >
                      Name (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: "title-desc",
                        }))
                      }
                    >
                      Name (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: "popularity",
                        }))
                      }
                    >
                      Most Popular
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - User Events */}
            <div className="lg:col-span-3 space-y-6">
              {isSignedIn && (
                <>
                  {/* Registered Events Section */}
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">
                        Your Events
                      </h2>
                      <Link
                        href="/my-events/attending"
                        className="text-sm text-purple-600 hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {registeredEvents.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          <EventCardsGrid
                            events={sortEvents(registeredEvents)}
                            showInterestButton={false}
                            variant="compact"
                          />
                        </div>
                      ) : (
                        <EmptyRegisteredEvents />
                      )}
                    </div>
                  </div>

                  {/* Interested Events Section */}
                  {interestedEvents.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                          Interested In
                        </h2>
                        <Link
                          href="/my-events/interested"
                          className="text-sm text-purple-600 hover:underline"
                        >
                          View all
                        </Link>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4">
                          <EventCardsGrid
                            events={sortEvents(interestedEvents)}
                            showInterestButton={false}
                            variant="compact"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Categories Section */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Categories
                </h2>
                <div className="space-y-2">
                  {[
                    "Garage Sale",
                    "Sports Match",
                    "Community Class",
                    "Volunteer",
                    "Exhibition",
                    "Festival",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2",
                        category === cat
                          ? "bg-purple-50 text-purple-700"
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          cat === "Garage Sale"
                            ? "bg-orange-100"
                            : cat === "Sports Match"
                            ? "bg-blue-100"
                            : cat === "Community Class"
                            ? "bg-purple-100"
                            : cat === "Volunteer"
                            ? "bg-green-100"
                            : cat === "Exhibition"
                            ? "bg-yellow-100"
                            : "bg-pink-100"
                        )}
                      ></span>
                      <span>{cat}</span>
                      {category === cat && (
                        <Check className="h-4 w-4 ml-auto text-purple-600" />
                      )}
                    </button>
                  ))}
                  {category && (
                    <button
                      onClick={() => setCategory(null)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors duration-200 flex items-center gap-2 text-sm"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear category</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Main Events */}
            <div className="lg:col-span-9 space-y-8">
              {/* Nearby Events Section */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    Events Near You
                  </h2>
                </div>
                {loadingNearby ? (
                  <div className="py-12">
                    <LoadingAnimation />
                  </div>
                ) : nearbyEvents.length > 0 ? (
                  <EventCardsGrid
                    events={sortEvents(nearbyEvents)}
                    onInterest={markInterest}
                    showDistance={true}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    No nearby events found. Please enable location services to
                    see events near you.
                  </div>
                )}
              </div>

              {/* All/Filtered Events Section */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    {searchTerm
                      ? `Search Results (${filteredEvents.length})`
                      : category
                      ? `${category} Events`
                      : "All Events"}
                  </h2>
                </div>
                {loading ? (
                  <div className="py-12">
                    <LoadingAnimation />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? "No events found matching your search"
                        : "No events available"}
                    </p>
                  </div>
                ) : (
                  <EventCardsGrid
                    events={sortEvents(applyFilter(filteredEvents))}
                    onInterest={markInterest}
                    showDistance={filters.showNearby}
                  />
                )}
              </div>

              {/* Past Events Section */}
              <div className="border-t border-gray-200 pt-8">
                <button
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className="flex items-center gap-2 text-xl font-semibold text-gray-800 hover:text-purple-600 transition-colors group w-full"
                >
                  <History className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                  Past Events
                  {showPastEvents ? (
                    <ChevronUp className="h-5 w-5 ml-2" />
                  ) : (
                    <ChevronDown className="h-5 w-5 ml-2" />
                  )}
                </button>

                {showPastEvents && (
                  <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    {loadingPastEvents ? (
                      <div className="py-12">
                        <LoadingAnimation />
                      </div>
                    ) : pastEvents.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-500">No past events found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-gray-500">
                          Showing {pastEvents.length} past events
                        </p>
                        <EventCardsGrid
                          events={sortEvents(pastEvents)}
                          showInterestButton={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
