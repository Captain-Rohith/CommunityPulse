"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { API_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

interface Issue {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  image_path: string | null;
  votes_count: number;
  created_at: string;
  is_approved: boolean;
}

export default function ManageIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchUserIssues();
  }, []);

  const fetchUserIssues = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/user/issues`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch issues");
      }

      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast.error("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (issueId: number) => {
    if (!confirm("Are you sure you want to delete this issue?")) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete issue");
      }

      toast.success("Issue deleted successfully");
      setIssues((prevIssues) =>
        prevIssues.filter((issue) => issue.id !== issueId)
      );
    } catch (error) {
      console.error("Error deleting issue:", error);
      toast.error("Failed to delete issue");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "resolved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Issues</h1>
        <Link href="/issues/create">
          <Button>Report New Issue</Button>
        </Link>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No issues reported</h3>
          <p className="text-gray-600">
            You haven't reported any community issues yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map((issue) => (
            <Card key={issue.id} className="overflow-hidden">
              {issue.image_path && (
                <div className="relative h-48 w-full">
                  <Image
                    src={`${API_URL}/${issue.image_path}`}
                    alt={issue.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl font-semibold">{issue.title}</h3>
                  <Badge className={getStatusColor(issue.status)}>
                    {issue.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{issue.location}</span>
                  <span>•</span>
                  <Badge variant="outline">{issue.category}</Badge>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-gray-600 mb-4">{issue.description}</p>
                <div className="text-sm text-gray-500">
                  <p>
                    Reported: {formatDistanceToNow(new Date(issue.created_at))}{" "}
                    ago
                  </p>
                  <p>Votes: {issue.votes_count}</p>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(issue.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Link href={`/issues/edit/${issue.id}`}>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
