"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

// Custom styles for the autocomplete dropdown
const autocompleteStyles = {
  container: {
    width: "100%",
  },
  suggestions: {
    backgroundColor: "white",
    border: "1px solid rgb(226, 232, 240)",
    borderRadius: "0.5rem",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    fontSize: "0.875rem",
    marginTop: "0.5rem",
    zIndex: 50,
  },
  suggestion: {
    padding: "0.75rem 1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  suggestionHighlighted: {
    backgroundColor: "rgb(243, 244, 246)",
  },
  matchedSubstrings: {
    fontWeight: "600",
    color: "rgb(17, 24, 39)",
  },
};

export function LocationAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Enter a location",
  error,
  className,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingScript, setIsLoadingScript] = useState(true);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      setIsLoadingScript(false);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoadError("Google Maps API key is not configured");
      console.error("Google Maps API key is missing");
      setIsLoadingScript(false);
      return;
    }

    // Create script element
    const googleMapsScript = document.createElement("script");
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;

    // Add load handlers
    googleMapsScript.addEventListener("load", () => {
      console.log("Google Maps script loaded successfully");
      setIsLoaded(true);
      setIsLoadingScript(false);
    });

    googleMapsScript.addEventListener("error", (error) => {
      console.error("Error loading Google Maps script:", error);
      setLoadError("Failed to load Google Maps");
      setIsLoadingScript(false);
    });

    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (!existingScript) {
      window.document.body.appendChild(googleMapsScript);
    } else {
      setIsLoadingScript(false);
    }

    return () => {
      // Only remove the script if we added it
      if (!existingScript && googleMapsScript.parentNode) {
        window.document.body.removeChild(googleMapsScript);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      // Initialize Google Places Autocomplete with custom styles
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          types: ["geocode", "establishment"],
        }
      );

      // Apply custom styles to the autocomplete dropdown
      const pacContainer = document.querySelector(
        ".pac-container"
      ) as HTMLElement;
      if (pacContainer) {
        // Apply container styles
        Object.assign(pacContainer.style, {
          marginTop: "4px",
          border: "1px solid rgb(226, 232, 240)",
          borderRadius: "0.5rem",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          fontSize: "0.875rem",
          backgroundColor: "white",
          zIndex: "50",
        });

        // Add styles for the items
        const style = document.createElement("style");
        style.textContent = `
          .pac-item {
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-top: 1px solid rgb(243, 244, 246);
            font-family: inherit;
          }
          .pac-item:hover {
            background-color: rgb(243, 244, 246);
          }
          .pac-item-selected {
            background-color: rgb(243, 244, 246);
          }
          .pac-icon {
            display: none;
          }
          .pac-item-query {
            font-size: 0.875rem;
            color: rgb(17, 24, 39);
            font-weight: 500;
          }
          .pac-matched {
            font-weight: 600;
            color: rgb(17, 24, 39);
          }
          .pac-item > span:not(.pac-item-query) {
            font-size: 0.75rem;
            color: rgb(107, 114, 128);
          }
        `;
        document.head.appendChild(style);
      }

      console.log("Autocomplete initialized successfully");

      // Add place_changed event listener
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        console.log("Selected place:", place);

        if (place && place.formatted_address) {
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          onChange(place.formatted_address, lat, lng);
        }
      });
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
      setLoadError("Error initializing location search");
    }

    return () => {
      // Cleanup event listeners when component unmounts
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pl-10",
            error ? "border-red-500 focus-visible:ring-red-500" : "",
            isLoadingScript ? "bg-gray-100" : "",
            className
          )}
          disabled={isLoadingScript}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {isLoadingScript ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      {loadError && (
        <p className="text-sm font-medium text-red-500">{loadError}</p>
      )}
      {isLoadingScript && (
        <p className="text-sm text-muted-foreground">
          Loading location search...
        </p>
      )}
    </div>
  );
}
