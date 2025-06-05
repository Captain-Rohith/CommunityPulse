"use client";

import { useEffect, useState } from "react";
import { IssueCard } from "./IssueCard";
import { API_URL } from "@/lib/constants";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "../ui/skeleton";

interface Issue {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  image_path: string | null;
  votes_count: number;
  has_voted: boolean;
  created_at: string;
  reporter: {
    username: string;
  };
}

interface IssuesListProps {
  selectedCategory?: string;
  selectedStatus?: string;
}

export function IssuesList({
  selectedCategory,
  selectedStatus,
}: IssuesListProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchIssues();
  }, [selectedCategory, selectedStatus]);

  const fetchIssues = async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let url = `${API_URL}/issues`;
      const params = new URLSearchParams();

      if (selectedCategory) {
        params.append("category", selectedCategory);
      }
      if (selectedStatus) {
        params.append("status", selectedStatus);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch issues");
      }

      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">No issues found</h3>
        <p className="text-gray-600">
          {selectedCategory || selectedStatus
            ? "Try adjusting your filters"
            : "Be the first to report a community issue!"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
