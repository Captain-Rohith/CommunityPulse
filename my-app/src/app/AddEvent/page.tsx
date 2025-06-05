"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  Tag,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { MainLayout } from "@/components/layouts/MainLayout";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define the form schema using Zod
const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().min(1, "Location is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    type: z.string().refine((val) => {
      if (val.toLowerCase() === "free") return true;
      const price = parseInt(val);
      return !isNaN(price) && price >= 50;
    }, "Type must be 'Free' or a price of at least ₹50"),
    category: z.enum(
      [
        "Garage Sale",
        "Sports Match",
        "Community Class",
        "Volunteer",
        "Exhibition",
        "Festival",
      ],
      { required_error: "Category is required" }
    ),
    start_date: z
      .string()
      .min(1, "Start date is required")
      .refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    end_date: z
      .string()
      .min(1, "End date is required")
      .refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
    registration_start: z
      .string()
      .min(1, "Registration start date is required")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "Invalid registration start date"
      ),
    registration_end: z
      .string()
      .min(1, "Registration end date is required")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "Invalid registration end date"
      ),
    image: z
      .any()
      .optional()
      .refine(
        (file) =>
          !file || (file instanceof File && file.size <= 5 * 1024 * 1024),
        "Image must be less than 5MB"
      ),
  })
  .refine(
    (data) => {
      const now = new Date();
      now.setSeconds(0, 0); // Remove seconds and milliseconds for comparison

      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const regStartDate = new Date(data.registration_start);
      const regEndDate = new Date(data.registration_end);

      // Set seconds and milliseconds to 0 for all dates
      startDate.setSeconds(0, 0);
      endDate.setSeconds(0, 0);
      regStartDate.setSeconds(0, 0);
      regEndDate.setSeconds(0, 0);

      // Check if end date is after start date
      if (endDate <= startDate) {
        throw new Error("Event end date must be after start date");
      }

      // Check if registration end is after registration start
      if (regEndDate <= regStartDate) {
        throw new Error(
          "Registration end date must be after registration start date"
        );
      }

      // Check if registration period ends before or at event start
      if (regEndDate > startDate) {
        throw new Error("Registration must end before or at event start time");
      }

      // Check if registration start is before event start
      if (regStartDate >= startDate) {
        throw new Error("Registration must start before event start time");
      }

      return true;
    },
    {
      message: "Invalid date configuration",
    }
  );

type EventFormValues = z.infer<typeof eventSchema>;

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">
              Something went wrong
            </h1>
            <p className="mt-2 text-gray-600">
              Please refresh the page or try again later.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AddEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { getToken, isSignedIn } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "Free",
      category: "Community Class",
      start_date: "",
      end_date: "",
      registration_start: "",
      registration_end: "",
      image: undefined,
    },
  });

  // Handle image change
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        form.setValue("image", file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        form.setValue("image", undefined);
        setImagePreview(null);
      }
    },
    [form]
  );

  // Add geocoding function
  const resolveLocation = async (locationInput: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not configured");
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        locationInput
      )}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error("Failed to resolve location");
    }

    const data = await response.json();
    if (data.status !== "OK" || !data.results?.[0]?.formatted_address) {
      throw new Error("Invalid location");
    }

    return data.results[0].formatted_address;
  };

  // Add helper functions for date validation
  const getMinDateTime = (field: keyof EventFormValues): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for timezone
    now.setSeconds(0, 0); // Remove seconds and milliseconds

    switch (field) {
      case "start_date":
        return now.toISOString().slice(0, 16);
      case "end_date": {
        const startDate = form.getValues("start_date");
        if (startDate) {
          const minDate = new Date(startDate);
          minDate.setMinutes(minDate.getMinutes() + 1); // Ensure at least 1 minute after start
          return minDate.toISOString().slice(0, 16);
        }
        return now.toISOString().slice(0, 16);
      }
      case "registration_start":
        return now.toISOString().slice(0, 16);
      case "registration_end": {
        const regStart = form.getValues("registration_start");
        if (regStart) {
          const minDate = new Date(regStart);
          minDate.setMinutes(minDate.getMinutes() + 1);
          return minDate.toISOString().slice(0, 16);
        }
        return now.toISOString().slice(0, 16);
      }
      default:
        return now.toISOString().slice(0, 16);
    }
  };

  const getMaxDateTime = (field: keyof EventFormValues): string => {
    switch (field) {
      case "registration_start":
      case "registration_end": {
        const startDate = form.getValues("start_date");
        if (startDate) {
          const maxDate = new Date(startDate);
          return maxDate.toISOString().slice(0, 16);
        }
        return "";
      }
      default:
        return "";
    }
  };

  // Add onChange handlers for date fields
  const handleDateChange = (field: keyof EventFormValues, value: string) => {
    form.setValue(field, value);
    form.clearErrors(field);

    // Validate dates immediately
    validateDates(field, value);

    // Clear dependent fields if they become invalid
    if (field === "start_date") {
      const endDate = form.getValues("end_date");
      const regStart = form.getValues("registration_start");
      const regEnd = form.getValues("registration_end");

      if (endDate && new Date(endDate) <= new Date(value)) {
        form.setValue("end_date", "");
        form.clearErrors("end_date");
      }
      if (regStart && new Date(regStart) >= new Date(value)) {
        form.setValue("registration_start", "");
        form.clearErrors("registration_start");
      }
      if (regEnd && new Date(regEnd) >= new Date(value)) {
        form.setValue("registration_end", "");
        form.clearErrors("registration_end");
      }

      // Force re-render of dependent fields to update their min/max constraints
      const formElement = document.getElementById("event-form");
      if (formElement) {
        const endDateInput = formElement.querySelector(
          'input[name="end_date"]'
        ) as HTMLInputElement;
        const regStartInput = formElement.querySelector(
          'input[name="registration_start"]'
        ) as HTMLInputElement;
        const regEndInput = formElement.querySelector(
          'input[name="registration_end"]'
        ) as HTMLInputElement;

        if (endDateInput) endDateInput.min = getMinDateTime("end_date");
        if (regStartInput) {
          regStartInput.min = getMinDateTime("registration_start");
          regStartInput.max = getMaxDateTime("registration_start");
        }
        if (regEndInput) {
          regEndInput.min = getMinDateTime("registration_end");
          regEndInput.max = getMaxDateTime("registration_end");
        }
      }
    }

    if (field === "registration_start" && form.getValues("registration_end")) {
      const regEnd = form.getValues("registration_end");
      if (new Date(regEnd) <= new Date(value)) {
        form.setValue("registration_end", "");
        form.clearErrors("registration_end");
      }

      // Update registration end min constraint
      const formElement = document.getElementById("event-form");
      if (formElement) {
        const regEndInput = formElement.querySelector(
          'input[name="registration_end"]'
        ) as HTMLInputElement;
        if (regEndInput) {
          regEndInput.min = getMinDateTime("registration_end");
          regEndInput.max = getMaxDateTime("registration_end");
        }
      }
    }
  };

  // Add validation function
  const validateDates = (field: keyof EventFormValues, value: string) => {
    const startDate =
      field === "start_date" ? value : form.getValues("start_date");
    const endDate = field === "end_date" ? value : form.getValues("end_date");
    const regStart =
      field === "registration_start"
        ? value
        : form.getValues("registration_start");
    const regEnd =
      field === "registration_end" ? value : form.getValues("registration_end");

    let errors: Partial<Record<keyof EventFormValues, string>> = {};

    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        errors.end_date = "End date must be after start date";
      }
    }

    if (startDate && regStart) {
      if (new Date(regStart) >= new Date(startDate)) {
        errors.registration_start =
          "Registration must start before event start";
      }
    }

    if (regStart && regEnd) {
      if (new Date(regEnd) <= new Date(regStart)) {
        errors.registration_end =
          "Registration end must be after registration start";
      }
    }

    if (startDate && regEnd) {
      if (new Date(regEnd) >= new Date(startDate)) {
        errors.registration_end = "Registration must end before event start";
      }
    }

    // Set errors for each field
    Object.entries(errors).forEach(([field, message]) => {
      form.setError(field as keyof EventFormValues, {
        type: "manual",
        message,
      });
    });

    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (values: EventFormValues) => {
    try {
      setError(null);
      setLoading(true);
      const token = await getToken();

      // Log the form values
      console.log("Form values:", values);

      // Format dates to ISO string with IST timezone
      const formatDate = (dateString: string) => {
        console.log("Formatting date:", dateString);

        // Create a date object and set to IST timezone
        const date = new Date(dateString);
        const istDate = new Date(
          date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const isoString = istDate.toISOString();

        console.log("Formatted to IST:", isoString);
        return isoString;
      };

      // Create FormData
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("location", values.location);

      // Only append coordinates if they exist
      if (typeof values.latitude === "number" && !isNaN(values.latitude)) {
        formData.append("latitude", values.latitude.toString());
      }
      if (typeof values.longitude === "number" && !isNaN(values.longitude)) {
        formData.append("longitude", values.longitude.toString());
      }

      formData.append("category", values.category);
      formData.append("type", values.type);

      // Format and append dates
      const formattedStartDate = formatDate(values.start_date);
      const formattedEndDate = formatDate(values.end_date);
      const formattedRegStart = formatDate(values.registration_start);
      const formattedRegEnd = formatDate(values.registration_end);

      formData.append("start_date", formattedStartDate);
      formData.append("end_date", formattedEndDate);
      formData.append("registration_start", formattedRegStart);
      formData.append("registration_end", formattedRegEnd);

      if (values.image instanceof File) {
        formData.append("image", values.image);
      }

      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        throw new Error(errorData.detail || "Failed to create event");
      }

      const data = await response.json();
      toast.success("Event created successfully");
      router.push(`/events/${data.id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create event"
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      );
    } finally {
      setLoading(false);
    }
  };

  // Render nothing if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Please Sign In</h1>
          <p className="mt-2 text-gray-600">
            You need to be signed in to create an event.
          </p>
          <Button className="mt-4" onClick={() => router.push("/sign-in")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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

            <Card className="max-w-4xl mx-auto border border-gray-100 shadow-sm rounded-xl">
              <CardHeader className="space-y-1">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                  Create New Event
                </h1>
                <p className="text-gray-500">
                  Fill in the details for your community event
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                    id="event-form"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Title</FormLabel>
                          <FormControl>
                            <input
                              {...field}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                              placeholder="Enter event title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Description
                          </FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[100px]"
                              placeholder="Describe your event"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            {/* Location */}
                          </FormLabel>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <LocationAutocomplete
                              value={field.value}
                              onChange={(value, lat, lng) => {
                                field.onChange(value);
                                if (lat && lng) {
                                  form.setValue("latitude", lat);
                                  form.setValue("longitude", lng);
                                }
                              }}
                              error={form.formState.errors.location?.message}
                              className="pl-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Category
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[
                                "Garage Sale",
                                "Sports Match",
                                "Community Class",
                                "Volunteer",
                                "Exhibition",
                                "Festival",
                              ].map((cat) => (
                                <SelectItem
                                  key={cat}
                                  value={cat}
                                  className="flex items-center gap-2"
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
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Event Type
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Select
                                onValueChange={(value) => {
                                  if (value === "paid") {
                                    field.onChange("50");
                                  } else {
                                    field.onChange("Free");
                                  }
                                }}
                                value={
                                  field.value.toLowerCase() === "free"
                                    ? "free"
                                    : "paid"
                                }
                              >
                                <SelectTrigger className="w-[120px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                              {field.value.toLowerCase() !== "free" && (
                                <div className="flex-1">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                      ₹
                                    </span>
                                    <input
                                      type="number"
                                      min="50"
                                      value={field.value}
                                      onChange={(e) =>
                                        field.onChange(e.target.value)
                                      }
                                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                      placeholder="Enter price"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Start Date & Time
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                  {...field}
                                  type="datetime-local"
                                  min={getMinDateTime("start_date")}
                                  onChange={(e) =>
                                    handleDateChange(
                                      "start_date",
                                      e.target.value
                                    )
                                  }
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              End Date & Time
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                  {...field}
                                  type="datetime-local"
                                  min={getMinDateTime("end_date")}
                                  onChange={(e) =>
                                    handleDateChange("end_date", e.target.value)
                                  }
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="registration_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Registration Start
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                  {...field}
                                  type="datetime-local"
                                  min={getMinDateTime("registration_start")}
                                  max={getMaxDateTime("registration_start")}
                                  onChange={(e) =>
                                    handleDateChange(
                                      "registration_start",
                                      e.target.value
                                    )
                                  }
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registration_end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Registration End
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                  {...field}
                                  type="datetime-local"
                                  min={getMinDateTime("registration_end")}
                                  max={getMaxDateTime("registration_end")}
                                  onChange={(e) =>
                                    handleDateChange(
                                      "registration_end",
                                      e.target.value
                                    )
                                  }
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Event Image
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <input
                                {...field}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                id="image-upload"
                              />
                              <label
                                htmlFor="image-upload"
                                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                              >
                                {imagePreview ? (
                                  <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="h-full object-contain rounded-lg"
                                  />
                                ) : (
                                  <div className="text-center">
                                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                                    <span className="mt-2 block text-sm text-gray-500">
                                      Click to upload an image
                                    </span>
                                  </div>
                                )}
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {error && (
                      <div className="text-red-500 text-sm mt-2">{error}</div>
                    )}

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        {loading ? "Creating..." : "Create Event"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ErrorBoundary>
  );
}
