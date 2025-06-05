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
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
  reporter: {
    username: string;
    email: string;
  };
}

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/admin/issues/pending`, {
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

  const handleApprove = async (issueId: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/admin/issues/${issueId}/approve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve issue");
      }

      toast.success("Issue approved successfully");
      setIssues((prevIssues) =>
        prevIssues.filter((issue) => issue.id !== issueId)
      );
    } catch (error) {
      console.error("Error approving issue:", error);
      toast.error("Failed to approve issue");
    }
  };

  const handleReject = async (issueId: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/admin/issues/${issueId}/reject`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject issue");
      }

      toast.success("Issue rejected successfully");
      setIssues((prevIssues) =>
        prevIssues.filter((issue) => issue.id !== issueId)
      );
    } catch (error) {
      console.error("Error rejecting issue:", error);
      toast.error("Failed to reject issue");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Pending Issues</h1>
          </div>
          <div className="text-center py-12">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/issues">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Issues
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Pending Issues</h1>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No pending issues</h3>
            <p className="text-gray-600">All issues have been reviewed</p>
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
                    <Badge>{issue.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{issue.location}</p>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-600 mb-4">{issue.description}</p>
                  <div className="text-sm text-gray-500">
                    <p>Reported by: {issue.reporter.username}</p>
                    <p>Email: {issue.reporter.email}</p>
                    <p>
                      Reported:{" "}
                      {formatDistanceToNow(new Date(issue.created_at))} ago
                    </p>
                    <p>Votes: {issue.votes_count}</p>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(issue.id)}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => handleApprove(issue.id)}>
                    Approve
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
