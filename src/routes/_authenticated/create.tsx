import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Link as LinkIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { db, supabase } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Create — ReelFlex" }] }),
  component: Create,
});

const TABS = ["Post", "Reel", "Story"] as const;
type Tab = (typeof TABS)[number];

// 100 years — effectively permanent for our use case
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 100;

async function uploadFile(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !data) throw signErr ?? new Error("Failed to sign URL");
  return data.signedUrl;
}

function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Post");
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const isReel = tab === "Reel";
  const accept = isReel ? "video/*" : "image/*";

  const previewUrl = file ? URL.createObjectURL(file) : url || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let mediaUrl = url.trim();
      if (source === "upload") {
        if (!file) throw new Error("Pick a file to upload");
        mediaUrl = await uploadFile(user.id, file);
      }
      if (!mediaUrl) throw new Error("Provide a URL or file");

      if (tab === "Post") {
        await db.from("posts").insert({ user_id: user.id, image_url: mediaUrl, caption: caption.trim() || null });
        toast.success("Post shared");
        navigate({ to: "/feed" });
      } else if (tab === "Reel") {
        await db.from("reels").insert({ user_id: user.id, video_url: mediaUrl, caption: caption.trim() || null });
        toast.success("Reel shared");
        navigate({ to: "/reels" });
      } else {
        await db.from("stories").insert({ user_id: user.id, image_url: mediaUrl });
        toast.success("Story shared (expires in 24h)");
        navigate({ to: "/feed" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Create</h1>
        <p className="text-sm text-muted-foreground">Upload media from your device or paste a URL.</p>

        <div className="mt-4 flex rounded-full bg-muted p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setFile(null); setUrl(""); }}
              className={`flex-1 rounded-full py-2 transition ${tab === t ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${source === "upload" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Upload className="h-3 w-3" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setSource("url")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${source === "url" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <LinkIcon className="h-3 w-3" /> URL
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {source === "upload" ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-input/30 px-4 py-8 text-center text-sm text-muted-foreground hover:bg-input/50">
              <Upload className="h-6 w-6 text-primary" />
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    Tap to choose {isReel ? "a video" : "an image"}
                  </span>
                  <span className="text-xs">{isReel ? "MP4, MOV up to ~50MB" : "JPG, PNG, WEBP"}</span>
                </>
              )}
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isReel ? "https://…/clip.mp4" : "https://…/photo.jpg"}
              className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
            />
          )}

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

          {previewUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              {isReel ? (
                <video src={previewUrl} controls className="aspect-[9/16] w-full bg-black object-contain" />
              ) : (
                <img src={previewUrl} alt="preview" className="aspect-square w-full object-cover" />
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
        </form>
      </div>
    </AppShell>
  );
}
