"use client";

import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ThumbsUp } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

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

interface IssueCardProps {
  issue: Issue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const [votesCount, setVotesCount] = useState(issue.votes_count);
  const [hasVoted, setHasVoted] = useState(issue.has_voted);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const handleVote = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/issues/${issue.id}/vote`, {
        method: hasVoted ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      setHasVoted(!hasVoted);
      setVotesCount(hasVoted ? votesCount - 1 : votesCount + 1);
    } catch (error) {
      console.error("Error voting:", error);
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

  const getCategoryGradient = (category: string) => {
    switch (category.toLowerCase()) {
      case "road":
        return "from-orange-500 to-red-600";
      case "sanitation":
        return "from-green-500 to-emerald-600";
      case "public safety":
        return "from-blue-500 to-indigo-600";
      case "infrastructure":
        return "from-yellow-500 to-orange-600";
      case "environment":
        return "from-teal-500 to-green-600";
      default:
        return "from-purple-500 to-blue-600";
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 w-full">
        {issue.image_path ? (
          <Image
            src={`${API_URL}/${issue.image_path}`}
            alt={issue.title}
            fill
            className="object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.classList.add(
                  "bg-gradient-to-br",
                  ...getCategoryGradient(issue.category).split(" ")
                );
              }
            }}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(
              issue.category
            )}`}
          />
        )}
      </div>

      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-semibold line-clamp-2">{issue.title}</h3>
          <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{issue.location}</span>
          <span>•</span>
          <Badge variant="outline">{issue.category}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-gray-600 line-clamp-3">{issue.description}</p>
      </CardContent>

      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <span>Reported by {issue.reporter.username}</span>
          <br />
          <span>{formatDistanceToNow(new Date(issue.created_at))} ago</span>
        </div>
        <Button
          variant={hasVoted ? "default" : "outline"}
          size="sm"
          onClick={handleVote}
          className="gap-2"
        >
          <ThumbsUp className="h-4 w-4" />
          <span>{votesCount}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
