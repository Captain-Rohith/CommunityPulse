"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { API_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";

const ISSUE_CATEGORIES = [
  "Road",
  "Sanitation",
  "Public Safety",
  "Infrastructure",
  "Environment",
  "Other",
];

interface Issue {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  image_path: string | null;
}

export default function EditIssuePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const router = useRouter();
  const { getToken } = useAuth();

  useEffect(() => {
    fetchIssue();
  }, [params.id]);

  const fetchIssue = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/issues/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch issue");
      }

      const data = await response.json();
      setIssue(data);
    } catch (error) {
      console.error("Error fetching issue:", error);
      toast.error("Failed to load issue");
      router.push("/issues/manage");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = await getToken();
      const formData = new FormData();

      // Get form values
      const form = e.currentTarget;
      const title = (form.elements.namedItem("title") as HTMLInputElement)
        ?.value;
      const description = (
        form.elements.namedItem("description") as HTMLTextAreaElement
      )?.value;
      const location = (form.elements.namedItem("location") as HTMLInputElement)
        ?.value;
      const category = (
        form.elements.namedItem("category") as HTMLSelectElement
      )?.value;

      if (!title || !description || !location || !category) {
        toast.error("Please fill in all required fields");
        return;
      }

      formData.append("title", title);
      formData.append("description", description);
      formData.append("location", location);
      formData.append("category", category);

      // Add image if a new one is selected
      const imageInput = form.elements.namedItem("image") as HTMLInputElement;
      if (imageInput?.files?.[0]) {
        formData.append("image", imageInput.files[0]);
      }

      const response = await fetch(`${API_URL}/issues/${params.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update issue");
      }

      toast.success("Issue updated successfully");
      router.push("/issues/manage");
    } catch (error) {
      console.error("Error updating issue:", error);
      toast.error("Failed to update issue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!issue) {
    return <div>Issue not found</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Issue</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              name="title"
              required
              defaultValue={issue.title}
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <Textarea
              name="description"
              required
              defaultValue={issue.description}
              placeholder="Detailed description of the issue"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              name="location"
              required
              defaultValue={issue.location}
              placeholder="Address or location description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select name="category" required defaultValue={issue.category}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
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

          <div>
            <label className="block text-sm font-medium mb-2">
              Image (optional)
            </label>
            {issue.image_path && (
              <div className="relative h-48 w-full mb-4">
                <Image
                  src={`${API_URL}/${issue.image_path}`}
                  alt="Current issue image"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            )}
            <Input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
            />
            {image && (
              <p className="text-sm text-gray-500 mt-1">
                Selected new image: {image.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Update Issue"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
