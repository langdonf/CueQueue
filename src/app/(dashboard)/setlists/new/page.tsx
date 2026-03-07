"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createSetlist } from "@/actions/setlist-actions";
import { toast } from "sonner";

export default function NewSetlistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createSetlist({
      name: formData.get("name") as string,
      venue: (formData.get("venue") as string) || null,
      gig_date: (formData.get("gig_date") as string) || null,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Setlist created");
    router.push(`/setlists/${result.id}`);
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
      <Link
        href="/setlists"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-6">New Setlist</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-1.5"
          >
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Friday Night at The Venue"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="venue"
            className="block text-sm font-medium mb-1.5"
          >
            Venue
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            placeholder="The Blue Note"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="gig_date"
            className="block text-sm font-medium mb-1.5"
          >
            Gig Date
          </label>
          <input
            id="gig_date"
            name="gig_date"
            type="date"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent [color-scheme:dark]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Setlist"}
        </button>
      </form>
    </div>
  );
}
