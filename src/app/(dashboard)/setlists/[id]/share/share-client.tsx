"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Trash2, Plus, Link as LinkIcon, Pencil, Loader2 } from "lucide-react";
import {
  createShareLink,
  getShareLinks,
  revokeShareLink,
  updateShareLinkName,
} from "@/actions/share-actions";
import { toast } from "sonner";

interface ShareLink {
  id: string;
  token: string;
  permission: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

interface SharePageClientProps {
  setlistId: string;
}

function CreateLinkModal({
  permission,
  onClose,
  onCreate,
}: {
  permission: "view" | "edit";
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    await onCreate(name);
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-1">
          New {permission === "edit" ? "edit" : "view-only"} link
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Give this link a name so you know who it&apos;s for.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Drummer, John's link"
          autoFocus
          disabled={creating}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) handleCreate();
            if (e.key === "Escape" && !creating) onClose();
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SharePageClient({ setlistId }: SharePageClientProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<"view" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const result = await getShareLinks(setlistId);
    if ("data" in result && result.data) setLinks(result.data);
    if ("error" in result) toast.error(result.error);
    setLoading(false);
  }, [setlistId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  async function handleCreate(permission: "view" | "edit", name: string) {
    setCreateModal(null);
    const result = await createShareLink(setlistId, permission, name);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    loadLinks();
    toast.success("Share link created");
  }

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);
    const result = await revokeShareLink(linkId);
    setRevokingId(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    toast.success("Link revoked");
  }

  async function handleRename(linkId: string) {
    setSavingNameId(linkId);
    const result = await updateShareLinkName(linkId, editingName);
    setSavingNameId(null);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === linkId ? { ...l, name: editingName.trim() || null } : l
        )
      );
    }
    setEditingId(null);
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
        Create a link to share this setlist with your bandmates. No account
        needed.
      </p>

      {/* Create buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setCreateModal("view")}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4" />
          View-only link
        </button>
        <button
          onClick={() => setCreateModal("edit")}
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
                {editingId === link.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(link.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(link.id);
                        if (e.key === "Escape" && !savingNameId) setEditingId(null);
                      }}
                      autoFocus
                      disabled={savingNameId === link.id}
                      className="flex-1 bg-transparent border-b border-primary outline-none text-sm font-medium disabled:opacity-50"
                      placeholder="Link name..."
                    />
                    {savingNameId === link.id && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {link.name || "Unnamed link"}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded shrink-0 ${
                        link.permission === "edit"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {link.permission}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingId(link.id);
                  setEditingName(link.name ?? "");
                }}
                disabled={revokingId === link.id}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Rename link"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={() => copyLink(link.token, link.id)}
                disabled={revokingId === link.id}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
                disabled={revokingId === link.id}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                aria-label="Revoke link"
              >
                {revokingId === link.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create link modal */}
      {createModal && (
        <CreateLinkModal
          permission={createModal}
          onClose={() => setCreateModal(null)}
          onCreate={async (name) => handleCreate(createModal, name)}
        />
      )}
    </div>
  );
}
