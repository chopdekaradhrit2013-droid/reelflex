import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Share2, Sparkles, X, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { db, supabase, type Reel } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { Avatar } from "@/components/app-shell";
import { VerifiedBadge } from "@/components/premium-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reels")({
  head: () => ({ meta: [{ title: "Reels — ReelFlex" }] }),
  component: ReelsPage,
});

function ReelsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);

  const { data: reels } = useQuery({
    queryKey: ["reels"],
    enabled: !!user,
    queryFn: async (): Promise<Reel[]> => {
      const { data } = await db
        .from("reels")
        .select("*, profile:profiles(*), reel_likes(user_id), reel_comments(id)")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []).map((r: any) => ({
        ...r,
        like_count: r.reel_likes?.length ?? 0,
        liked: !!r.reel_likes?.some((l: any) => l.user_id === user?.id),
        comment_count: r.reel_comments?.length ?? 0,
      }));
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (reel: Reel) => {
      if (!user) return;
      if (reel.liked) {
        await db.from("reel_likes").delete().eq("reel_id", reel.id).eq("user_id", user.id);
      } else {
        await db.from("reel_likes").insert({ reel_id: reel.id, user_id: user.id });
      }
    },
    onMutate: (reel) => {
      qc.setQueryData<Reel[]>(["reels"], (old) =>
        old?.map((r) =>
          r.id === reel.id
            ? { ...r, liked: !r.liked, like_count: (r.like_count ?? 0) + (r.liked ? -1 : 1) }
            : r,
        ),
      );
    },
  });

  async function share(reel: Reel) {
    const url = reel.video_url;
    try {
      if (navigator.share) await navigator.share({ title: "ReelFlex", text: reel.caption ?? "Watch this reel!", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-20 bg-black">
      <Link
        to="/feed"
        className="absolute left-4 top-4 z-30 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur"
      >
        Home
      </Link>
      <Link
        to="/create"
        className="absolute right-4 top-4 z-30 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur"
      >
        + New
      </Link>
      <div className="h-full w-full snap-y snap-mandatory overflow-y-auto">
        {!reels || reels.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
            <Sparkles className="h-10 w-10 text-[var(--color-neon-pink)]" />
            <p className="text-sm opacity-80">No reels yet. Upload one!</p>
            <Link to="/create" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Create reel
            </Link>
          </div>
        ) : (
          reels.map((r) => (
            <ReelView
              key={r.id}
              reel={r}
              onLike={() => toggleLike.mutate(r)}
              onComment={() => setCommentsFor(r)}
              onShare={() => share(r)}
            />
          ))
        )}
      </div>

      {commentsFor && <ReelCommentsSheet reel={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  );
}

function ReelView({
  reel,
  onLike,
  onComment,
  onShare,
}: {
  reel: Reel;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const premium = (reel.profile as any)?.super_reelflex;

  return (
    <section className="relative flex h-screen w-full snap-start items-center justify-center">
      <video
        ref={ref}
        src={reel.video_url}
        poster={reel.thumbnail_url ?? undefined}
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
        onClick={(e) => {
          const v = e.currentTarget;
          v.muted = !v.muted;
        }}
      />
      <div className="absolute bottom-24 left-4 right-20 text-white drop-shadow-md">
        <Link to="/profile/$username" params={{ username: reel.profile?.username ?? "" }} className="flex items-center gap-2">
          <Avatar url={reel.profile?.avatar_url} name={reel.profile?.username} size={36} ring />
          <span className="text-sm font-semibold">@{reel.profile?.username}</span>
          {premium && <VerifiedBadge />}
        </Link>
        {reel.caption && <p className="mt-2 text-sm">{reel.caption}</p>}
      </div>
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <Heart className={`h-8 w-8 ${reel.liked ? "fill-[var(--color-neon-pink)] text-[var(--color-neon-pink)]" : ""}`} />
          <span className="text-xs">{reel.like_count ?? 0}</span>
        </button>
        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8" />
          <span className="text-xs">{(reel as any).comment_count ?? 0}</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8" />
          <span className="text-xs">Share</span>
        </button>
      </div>
    </section>
  );
}

function ReelCommentsSheet({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["reel-comments", reel.id],
    queryFn: async () => {
      const { data } = await db
        .from("reel_comments")
        .select("*, profile:profiles(username, avatar_url, super_reelflex)")
        .eq("reel_id", reel.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`reel-c-${reel.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reel_comments", filter: `reel_id=eq.${reel.id}` },
        () => qc.invalidateQueries({ queryKey: ["reel-comments", reel.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reel.id, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !text.trim()) return;
      const { error } = await db.from("reel_comments").insert({ reel_id: reel.id, user_id: user.id, text: text.trim() });
      if (error) throw error;
      setText("");
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full flex-col rounded-t-2xl bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="text-sm font-semibold">Comments</div>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {comments?.length === 0 && <p className="text-center text-muted-foreground">Be the first to comment</p>}
          {comments?.map((c: any) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar url={c.profile?.avatar_url} name={c.profile?.username} size={28} />
              <div>
                <div className="text-xs font-semibold">
                  @{c.profile?.username} {c.profile?.super_reelflex && <VerifiedBadge />}
                </div>
                <div>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
          className="flex items-center gap-2 border-t border-border/60 p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-input bg-input/40 px-4 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={!text.trim()} className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
