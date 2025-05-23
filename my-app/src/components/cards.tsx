import * as React from "react";
import { Calendar, MapPin, Clock, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: number;
  title: string;
  category: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  description: string;
  attendees?: number;
}
interface EventCardProps {
  event: Event;
  className?: string;
  onInterest?: (eventId: number) => void;
}

function EventCard({ event, className, onInterest, ...props }: EventCardProps) {
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

  const handleInterestClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInterest) {
      onInterest(event.id);
    }
  };

  const buttonText = event.userInterested ? "Not Interested" : "I'm Interested";
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

  return (
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
          // Display uploaded image if available
          <img
            src={`${API_URL}/${event.image_path}`}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error(
                `Failed to load image: ${API_URL}/${event.image_path}`
              );
              // Fall back to gradient if image fails to load
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
          // Use gradient as fallback
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80"></div>
        )}
        <div className="absolute top-4 right-4 bg-white/90 text-xs font-medium px-2 py-1 rounded-full">
          {event.category}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Title and date */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
          <div className="flex items-center text-muted-foreground text-sm gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.date)}</span>
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
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {event.description}
        </p>

        {/* Footer with attendance and action button */}
        <div className="flex items-center justify-between mt-2 pt-4 border-t">
          <div className="flex items-center text-sm gap-1.5">
            <Users className="h-4 w-4" />
            <span>{event.attendees || 0} attending</span>
          </div>
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              event.userInterested
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            onClick={handleInterestClick}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Event Cards Grid component
function EventCardsGrid({
  events,
  onInterest,
}: {
  events: Event[];
  onInterest?: (eventId: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} onInterest={onInterest} />
      ))}
    </div>
  );
}

export { EventCard, EventCardsGrid };
