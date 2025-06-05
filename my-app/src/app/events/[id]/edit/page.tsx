"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Image as ImageIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
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
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainLayout } from "@/components/layouts/MainLayout";

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
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const regStartDate = new Date(data.registration_start);
      const regEndDate = new Date(data.registration_end);

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

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { getToken, isSignedIn } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "Free",
      latitude: undefined,
      longitude: undefined,
      category: "Community Class",
      start_date: "",
      end_date: "",
      registration_start: "",
      registration_end: "",
      image: undefined,
    },
  });

  // Fetch event details
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

          // If not organizer or admin, redirect back
          if (!userData.is_admin && data.organizer_id !== userData.id) {
            toast.error("You don't have permission to edit this event");
            router.push(`/events/${params.id}`);
            return;
          }
        }

        // Format dates for the form
        const formatDate = (dateString: string) => {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:mm"
        };

        // Set form values
        form.reset({
          title: data.title,
          description: data.description,
          location: data.location,
          type: data.type || "Free",
          latitude: data.latitude,
          longitude: data.longitude,
          category: data.category,
          start_date: formatDate(data.start_date),
          end_date: formatDate(data.end_date),
          registration_start: formatDate(data.registration_start),
          registration_end: formatDate(data.registration_end),
        });

        // Set image preview if exists
        if (data.image_path) {
          setImagePreview(`${API_URL}/${data.image_path}`);
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
  }, [params.id, getToken, isSignedIn, form, router]);

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

  // Update getMinDateTime to remove future date requirements
  const getMinDateTime = (field: keyof EventFormValues): string => {
    switch (field) {
      case "end_date": {
        const startDate = form.getValues("start_date");
        if (startDate) {
          const minDate = new Date(startDate);
          minDate.setMinutes(minDate.getMinutes() + 1); // Ensure at least 1 minute after start
          return minDate.toISOString().slice(0, 16);
        }
        return "";
      }
      case "registration_end": {
        const regStart = form.getValues("registration_start");
        if (regStart) {
          const minDate = new Date(regStart);
          minDate.setMinutes(minDate.getMinutes() + 1);
          return minDate.toISOString().slice(0, 16);
        }
        return "";
      }
      default:
        return "";
    }
  };

  // Update getMaxDateTime to only enforce registration before event start
  const getMaxDateTime = (field: keyof EventFormValues): string => {
    switch (field) {
      case "registration_start":
      case "registration_end": {
        const startDate = form.getValues("start_date");
        if (startDate) {
          const maxDate = new Date(startDate);
          maxDate.setMinutes(maxDate.getMinutes() - 1);
          return maxDate.toISOString().slice(0, 16);
        }
        return "";
      }
      default:
        return "";
    }
  };

  // Add helper functions for date validation
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

  const onSubmit = async (values: EventFormValues) => {
    try {
      setError(null);
      const token = await getToken();

      // Create FormData
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("location", values.location);
      formData.append("latitude", values.latitude?.toString() || "");
      formData.append("longitude", values.longitude?.toString() || "");
      formData.append("category", values.category);
      formData.append("type", values.type);
      formData.append("start_date", values.start_date);
      formData.append("end_date", values.end_date);
      formData.append("registration_start", values.registration_start);
      formData.append("registration_end", values.registration_end);
      if (values.image instanceof File) {
        formData.append("image", values.image);
      }

      const response = await fetch(`${API_URL}/events/${params.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      toast.success("Event updated successfully");
      router.push(`/events/${params.id}`);
    } catch (error) {
      console.error("Error updating event:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update event"
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Link href="/home" style={{ textDecoration: "none" }}>
          <Button>Home</Button>
        </Link>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <h1 className="text-2xl font-bold">Edit Event</h1>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                id="event-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Event title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={(value) => {
                              if (value === "paid") {
                                // When switching to paid, set a default price
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
                            <SelectTrigger className="w-[120px]">
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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="50"
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(e.target.value)
                                  }
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                          placeholder="Event description"
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
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="Garage Sale">Garage Sale</option>
                          <option value="Sports Match">Sports Match</option>
                          <option value="Community Class">
                            Community Class
                          </option>
                          <option value="Volunteer">Volunteer</option>
                          <option value="Exhibition">Exhibition</option>
                          <option value="Festival">Festival</option>
                        </select>
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
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <input
                              {...field}
                              type="datetime-local"
                              onChange={(e) =>
                                handleDateChange("start_date", e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                        <FormLabel>End Date & Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <input
                              {...field}
                              type="datetime-local"
                              onChange={(e) =>
                                handleDateChange("end_date", e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                        <FormLabel>Registration Start</FormLabel>
                        <FormControl>
                          <div className="relative">
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
                              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                        <FormLabel>Registration End</FormLabel>
                        <FormControl>
                          <div className="relative">
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
                              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                      <FormLabel>Event Image</FormLabel>
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
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                          >
                            {imagePreview ? (
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-full object-contain"
                              />
                            ) : (
                              <div className="text-center">
                                <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                                <span className="mt-2 block text-sm text-gray-600">
                                  Click to upload a new image
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
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Update Event</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
