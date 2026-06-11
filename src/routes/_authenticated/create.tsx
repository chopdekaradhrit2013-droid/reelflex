import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Create — ReelFlex" }] }),
  component: Create,
});

const TABS = ["Post", "Reel", "Story"] as const;
type Tab = (typeof TABS)[number];

function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Post");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !url.trim()) return;
    setBusy(true);
    try {
      if (tab === "Post") {
        await db.from("posts").insert({ user_id: user.id, image_url: url.trim(), caption: caption.trim() || null });
        toast.success("Post shared");
        navigate({ to: "/feed" });
      } else if (tab === "Reel") {
        await db.from("reels").insert({ user_id: user.id, video_url: url.trim(), caption: caption.trim() || null });
        toast.success("Reel shared");
        navigate({ to: "/reels" });
      } else {
        await db.from("stories").insert({ user_id: user.id, image_url: url.trim() });
        toast.success("Story shared (expires in 24h)");
        navigate({ to: "/feed" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Create</h1>
        <p className="text-sm text-muted-foreground">Paste a public media URL — we keep it simple.</p>

        <div className="mt-4 flex rounded-full bg-muted p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 transition ${tab === t ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">
            {tab === "Reel" ? "Video URL (.mp4)" : "Image URL"}
          </label>
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={tab === "Reel" ? "https://…/clip.mp4" : "https://…/photo.jpg"}
            className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
          />

          {tab !== "Story" && (
            <>
              <label className="block text-xs font-medium text-muted-foreground">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something…"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
              />
            </>
          )}

          {url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              {tab === "Reel" ? (
                <video src={url} controls className="aspect-[9/16] w-full bg-black object-contain" />
              ) : (
                <img src={url} alt="preview" className="aspect-square w-full object-cover" />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-50"
          >
            {busy ? "Sharing…" : `Share ${tab.toLowerCase()}`}
          </button>

          <details className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Need example URLs?</summary>
            <div className="mt-2 space-y-1">
              <div>Image: https://picsum.photos/seed/reelflex/800</div>
              <div>Video: https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4</div>
            </div>
          </details>
        </form>
      </div>
    </AppShell>
  );
}
