"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Trash2, Plus, Link as LinkIcon } from "lucide-react";
import { createShareLink, getShareLinks, revokeShareLink } from "@/actions/share-actions";
import { toast } from "sonner";

interface ShareLink {
  id: string;
  token: string;
  permission: string;
  is_active: boolean;
  created_at: string;
}

interface SharePageClientProps {
  setlistId: string;
}

export function SharePageClient({ setlistId }: SharePageClientProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const result = await getShareLinks(setlistId);
    if ("data" in result && result.data) setLinks(result.data);
    if ("error" in result) toast.error(result.error);
    setLoading(false);
  }, [setlistId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  async function handleCreate(permission: "view" | "edit") {
    const result = await createShareLink(setlistId, permission);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    loadLinks();
    toast.success("Share link created");
  }

  async function handleRevoke(linkId: string) {
    const result = await revokeShareLink(linkId);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    toast.success("Link revoked");
  }

  async function copyLink(token: string, id: string) {
    try {
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copied!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy link to clipboard");
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
      <Link
        href={`/setlists/${setlistId}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to setlist
      </Link>

      <h1 className="text-2xl font-bold mb-2">Share Setlist</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Create a link to share this setlist with your bandmates. No account needed.
      </p>

      {/* Create buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleCreate("view")}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4" />
          View-only link
        </button>
        <button
          onClick={() => handleCreate("edit")}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Edit link
        </button>
      </div>

      {/* Existing links */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Loading...
        </p>
      ) : links.length === 0 ? (
        <div className="text-center py-8">
          <LinkIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No share links yet. Create one above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded ${
                      link.permission === "edit"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {link.permission}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                  /shared/{link.token.slice(0, 12)}...
                </p>
              </div>

              <button
                onClick={() => copyLink(link.token, link.id)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy link"
              >
                {copiedId === link.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => handleRevoke(link.id)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Revoke link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
