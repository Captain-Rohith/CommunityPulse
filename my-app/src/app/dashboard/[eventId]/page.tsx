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
  registrations: number;
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
            <div className="flex flex-col gap-6">
              <Button
                variant="ghost"
                className="w-fit text-gray-600 hover:text-purple-600 transition-colors"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                  {dashboardData.title} Dashboard
                </h1>
                <p className="text-gray-600">
                  Track your event's performance and engagement metrics
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Views
                  </CardTitle>
                  <Eye className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.views}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Likes
                  </CardTitle>
                  <Heart className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.likes}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Registrations
                  </CardTitle>
                  <Users className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.registrations}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Interested Users
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.interested}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Registration Trend Chart */}
            <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Registration Trend
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Track daily registration activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.daily_registrations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#9C5789"
                        strokeWidth={2}
                        dot={{ fill: "#9C5789" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span>
                    Created:{" "}
                    {new Date(dashboardData.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span>
                    Last Updated:{" "}
                    {new Date(dashboardData.last_updated).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
