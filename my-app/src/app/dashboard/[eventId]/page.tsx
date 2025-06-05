"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Eye,
  Heart,
  Users,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layouts/MainLayout";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { Separator } from "@/components/ui/separator";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardData {
  event_id: number;
  title: string;
  views: number;
  likes: number;
  registrations: {
    total: number;
    total_attendees: number;
    average_age: number | null;
    age_distribution: {
      "0-18": number;
      "19-25": number;
      "26-35": number;
      "36-50": number;
      "50+": number;
    };
    attendees: Array<{
      name: string;
      age: string;
      phone: string;
    }>;
  };
  interested: number;
  daily_registrations: Array<{
    date: string;
    count: number;
  }>;
  created_at: string;
  last_updated: string;
}

export default function EventDashboard() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/events/${params.eventId}/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (params.eventId) {
      fetchDashboardData();
    }
  }, [params.eventId, getToken]);

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

  if (error || !dashboardData) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Error Loading Dashboard
              </h2>
              <p className="text-gray-600">
                {error || "No dashboard data available"}
              </p>
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
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">
                {dashboardData?.title} Dashboard
              </h1>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardData?.views}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Likes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardData?.likes}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-green-400 mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardData?.registrations.total}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Interested Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-blue-400 mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardData?.interested}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Registration Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Registration Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Registration Statistics</CardTitle>
                  <CardDescription>
                    Detailed breakdown of registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Attendees
                      </p>
                      <p className="text-2xl font-bold">
                        {dashboardData?.registrations.total_attendees}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Average Age
                      </p>
                      <p className="text-2xl font-bold">
                        {dashboardData?.registrations.average_age
                          ? `${dashboardData.registrations.average_age} years`
                          : "N/A"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Age Distribution
                      </p>
                      <div className="space-y-2">
                        {dashboardData?.registrations.age_distribution &&
                          Object.entries(
                            dashboardData.registrations.age_distribution
                          ).map(([range, count]) => (
                            <div
                              key={range}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-600">
                                {range}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 rounded-full"
                                    style={{
                                      width: `${
                                        (count /
                                          dashboardData.registrations
                                            .total_attendees) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-8 text-right">
                                  {count}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registration Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Registration Trend</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dashboardData?.daily_registrations}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Attendees List */}
            <Card>
              <CardHeader>
                <CardTitle>Registered Attendees</CardTitle>
                <CardDescription>
                  List of all registered attendees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-3 gap-4 p-4 font-medium text-gray-500 border-b">
                    <div>Name</div>
                    <div>Age</div>
                    <div>Phone</div>
                  </div>
                  <div className="divide-y">
                    {dashboardData?.registrations.attendees.map(
                      (attendee, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-3 gap-4 p-4 hover:bg-gray-50"
                        >
                          <div className="text-gray-900">{attendee.name}</div>
                          <div className="text-gray-600">
                            {attendee.age || "N/A"}
                          </div>
                          <div className="text-gray-600">
                            {attendee.phone || "N/A"}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
