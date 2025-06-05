"use client";

import { ContentToggle } from "@/components/ContentToggle";
import { IssuesList } from "@/components/issues/IssuesList";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { API_URL } from "@/lib/constants";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

const ISSUE_CATEGORIES = [
  "All",
  "Road",
  "Sanitation",
  "Public Safety",
  "Infrastructure",
  "Environment",
  "Other",
];

const ISSUE_STATUS = ["All", "Pending", "Approved", "Resolved"];

interface IssueStats {
  total: number;
  resolved: number;
  pending: number;
}

export default function IssuesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [stats, setStats] = useState<IssueStats>({
    total: 0,
    resolved: 0,
    pending: 0,
  });
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isSignedIn) return;

      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
    fetchStats();
  }, [isSignedIn, getToken]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/issues`);
      if (response.ok) {
        const issues = await response.json();
        setStats({
          total: issues.length,
          resolved: issues.filter((i: any) => i.status === "resolved").length,
          pending: issues.filter((i: any) => i.status === "pending").length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <ContentToggle activeContent="issues" />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 mb-8 text-white overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Community Issues</h1>
          <p className="text-lg mb-6">
            Report and track local issues to make our community better together.
          </p>
          <Link href="/issues/create">
            <Button variant="secondary" size="lg">
              Report an Issue
            </Button>
          </Link>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10">
          <AlertCircleIcon size={180} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Stats Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Issues Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Issues</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">Resolved</span>
              <div className="flex items-center gap-1">
                <CheckCircleIcon size={16} />
                <span className="font-semibold">{stats.resolved}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-yellow-600">
              <span className="text-sm">Pending</span>
              <div className="flex items-center gap-1">
                <AlertCircleIcon size={16} />
                <span className="font-semibold">{stats.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Browse Issues</h2>
              <p className="text-gray-600">
                Filter and explore community issues
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              {isAdmin && (
                <Link href="/admin/issues">
                  <Button variant="outline">Admin Dashboard</Button>
                </Link>
              )}
              <Link href="/issues/create">
                <Button>Report an Issue</Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <IssuesList
            selectedCategory={
              selectedCategory === "All" ? undefined : selectedCategory
            }
            selectedStatus={
              selectedStatus === "All"
                ? undefined
                : selectedStatus.toLowerCase()
            }
          />
        </div>
      </div>
    </main>
  );
}
