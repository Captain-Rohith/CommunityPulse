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
import { Eye, Heart, Users, TrendingUp } from "lucide-react";

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
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!dashboardData) {
    return <div className="p-8">No dashboard data available</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => router.back()}
          >
            ← Back
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">
              Hi {user?.firstName || user?.username}, Welcome to{" "}
              {dashboardData.title} Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your event's performance and engagement metrics
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.views}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.likes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Registrations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.registrations}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Interested Users
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.interested}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.daily_registrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created At
              </p>
              <p>{new Date(dashboardData.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p>{new Date(dashboardData.last_updated).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
