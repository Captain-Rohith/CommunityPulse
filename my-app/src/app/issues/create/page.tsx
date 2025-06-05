"use client";

import { useState, useRef, FormEvent } from "react";
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

const ISSUE_CATEGORIES = [
  "Road",
  "Sanitation",
  "Public Safety",
  "Infrastructure",
  "Environment",
  "Other",
];

export default function CreateIssuePage() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { getToken } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    setLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();

      // Get form values using the form reference
      const form = formRef.current;
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

      // Add image if exists
      const imageInput = form.elements.namedItem("image") as HTMLInputElement;
      if (imageInput?.files?.[0]) {
        formData.append("image", imageInput.files[0]);
      }

      const response = await fetch(`${API_URL}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create issue");
      }

      toast.success("Issue reported successfully!");
      router.push("/issues");
    } catch (error) {
      console.error("Error creating issue:", error);
      toast.error("Failed to report issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Report an Issue</h1>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              name="title"
              required
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
              placeholder="Detailed description of the issue"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              name="location"
              required
              placeholder="Address or location description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select name="category" required>
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
            <Input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
            />
            {image && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {image.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Reporting..." : "Report Issue"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
