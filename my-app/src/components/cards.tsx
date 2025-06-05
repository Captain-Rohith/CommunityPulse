"use client";

import * as React from "react";
import { Calendar, MapPin, Clock, Users, Tag, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: number;
  title: string;
  category: string;
  date: string;
  enddate: string;
  location: string;
  startTime: string;
  endTime: string;
  description: string;
  attendees?: number;
  image_path?: string;
  userInterested?: boolean;
  is_approved?: boolean;
  distance?: number;
  type: string;
  views?: number;
  status?: string;
}

interface EventCardProps {
  event: Event;
  className?: string;
  onInterest?: (eventId: number) => void;
  showInterestButton?: boolean;
  showEditButton?: boolean;
  showApprovalStatus?: boolean;
  showDistance?: boolean;
  variant?: "default" | "compact";
}

function EventCard({
  event,
  className,
  onInterest,
  showInterestButton = true,
  showEditButton = false,
  showApprovalStatus = false,
  showDistance = false,
  variant = "default",
  ...props
}: EventCardProps) {
  // Handle event date formatting
  interface FormatDateOptions extends Intl.DateTimeFormatOptions {}
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const formatDate = (dateString: string): string => {
    const options: FormatDateOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const handleInterestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInterest) {
      onInterest(event.id);
    }
  };

  const buttonText =
    event.status === "interested"
      ? "Complete Registration"
      : event.userInterested
      ? "Not Interested"
      : "I'm Interested";

  const buttonStyle =
    event.status === "interested"
      ? "bg-purple-600 text-white hover:bg-purple-700"
      : event.userInterested
      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
      : "bg-primary text-primary-foreground hover:bg-primary/90";

  // Handle event time formatting
  interface FormatTimeOptions extends Intl.DateTimeFormatOptions {}

  const formatTime = (timeString: string): string => {
    const options: FormatTimeOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString(
      "en-US",
      options
    );
  };

  // Early return for compact variant
  if (variant === "compact") {
    return (
      <Link href={`/events/${event.id}`} className="block">
        <div
          className={cn(
            "bg-card text-card-foreground flex rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200",
            className
          )}
          {...props}
        >
          {/* Compact image */}
          <div className="relative w-20 h-20 rounded-l-lg overflow-hidden flex-shrink-0">
            {event.image_path ? (
              <img
                src={`${API_URL}/${event.image_path}`}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const gradientDiv = document.createElement("div");
                    gradientDiv.className =
                      "absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80";
                    parent.appendChild(gradientDiv);
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80"></div>
            )}
          </div>

          {/* Compact content */}
          <div className="flex-1 p-2 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm line-clamp-1">
                  {event.title}
                </h3>
                <div className="flex items-center text-muted-foreground text-xs gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center text-muted-foreground text-xs gap-1 mt-0.5">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {formatTime(event.startTime)}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-sm whitespace-nowrap",
                  event.type === "Free"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                )}
              >
                {event.type !== "Free" && "₹"}
                {event.type}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Original card render
  return (
    <Link href={`/events/${event.id}`} className="block">
      <div
        className={cn(
          "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200",
          className
        )}
        {...props}
      >
        {/* Event image or gradient background */}
        <div className="relative h-40 rounded-t-xl overflow-hidden">
          {event.image_path ? (
            <img
              src={`${API_URL}/${event.image_path}`}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(
                  `Failed to load image: ${API_URL}/${event.image_path}`
                );
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const gradientDiv = document.createElement("div");
                  gradientDiv.className =
                    "absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80";
                  parent.appendChild(gradientDiv);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80"></div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            {showApprovalStatus && (
              <div
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  event.is_approved
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                {event.is_approved ? "Approved" : "Pending"}
              </div>
            )}
            <div className="bg-white/90 text-xs font-medium px-2 py-1 rounded-full">
              {event.category}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1 flex flex-col">
          {/* Title and type/distance pills */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-3">
              <h3 className="text-lg font-semibold line-clamp-2 flex-1">
                {event.title}
              </h3>
              {showDistance && event.distance !== undefined ? (
                <div className="flex flex-col">
                  <div
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-t-sm text-center min-w-[90px]",
                      event.type === "Free"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    )}
                  >
                    {event.type !== "Free" && "₹"}
                    {event.type}
                  </div>
                  <div className="text-xs font-medium px-3 py-1.5 rounded-b-sm bg-gray-100 text-gray-800 text-center border-t border-white/20">
                    {event.distance.toFixed(1)} km away
                  </div>
                </div>
              ) : (
                <span
                  className={`text-sm px-2 py-1 rounded-sm ${
                    event.type === "Free"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {event.type !== "Free" && "₹"}
                  {event.type}
                </span>
              )}
            </div>
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(event.date)} - {formatDate(event.enddate)}
              </span>
            </div>
          </div>

          {/* Location and time */}
          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </span>
            </div>
            <div className="flex items-center text-muted-foreground text-sm gap-1.5">
              <Eye className="h-4 w-4" />
              <span>{event.views || 0} views</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description}
          </p>

          {/* Footer with attendance, edit button, and interest button */}
          <div className="flex items-center justify-between mt-auto pt-4">
            <div className="flex items-center text-sm gap-1.5">
              <Users className="h-4 w-4" />
              <span>{event.attendees || 0} attending</span>
            </div>
            <div className="flex gap-2">
              {showEditButton && (
                <Link
                  href={`/events/${event.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
                >
                  Edit
                </Link>
              )}
              {showInterestButton && (
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${buttonStyle}`}
                  onClick={handleInterestClick}
                >
                  {buttonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Event Cards Grid component
function EventCardsGrid({
  events,
  onInterest,
  showInterestButton = true,
  showEditButton = false,
  showApprovalStatus = false,
  showDistance = false,
  variant = "default",
}: {
  events: Event[];
  onInterest?: (eventId: number) => void;
  showInterestButton?: boolean;
  showEditButton?: boolean;
  showApprovalStatus?: boolean;
  showDistance?: boolean;
  variant?: "default" | "compact";
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        variant === "compact"
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onInterest={onInterest}
          showInterestButton={showInterestButton}
          showEditButton={showEditButton}
          showApprovalStatus={showApprovalStatus}
          showDistance={showDistance}
          variant={variant}
        />
      ))}
    </div>
  );
}

export { EventCard, EventCardsGrid };
