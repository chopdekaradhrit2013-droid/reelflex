import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Play } from "lucide-react";
import { useRef, useEffect } from "react";
import { AppShell, Avatar } from "@/components/app-shell";
import { StoryStrip } from "@/components/story-strip";
import { PostCard } from "@/components/post-card";
import { AnnouncementsBar } from "@/components/announcements-bar";
import { VerifiedBadge } from "@/components/premium-badge";
import { db, type Post, type Reel } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — ReelFlex" }] }),
  component: Feed,
});

type FeedItem =
  | { kind: "post"; created_at: string; data: Post }
  | { kind: "reel"; created_at: string; data: Reel };

function Feed() {
  const { user } = useAuth();

  const { data: items, isLoading } = useQuery({
    queryKey: ["feed-mixed", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FeedItem[]> => {
      const [{ data: postsData }, { data: reelsData }] = await Promise.all([
        db
          .from("posts")
          .select("*, profile:profiles(*), post_likes(user_id), comments(id)")
          .order("created_at", { ascending: false })
          .limit(50),
        db
          .from("reels")
          .select("*, profile:profiles(*), reel_likes(user_id), reel_comments(id)")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      const posts: FeedItem[] = (postsData ?? []).map((p: any) => ({
        kind: "post" as const,
        created_at: p.created_at,
        data: {
          ...p,
          like_count: p.post_likes?.length ?? 0,
          liked: !!p.post_likes?.some((l: any) => l.user_id === user?.id),
          comment_count: p.comments?.length ?? 0,
        },
      }));
      const reels: FeedItem[] = (reelsData ?? []).map((r: any) => ({
        kind: "reel" as const,
        created_at: r.created_at,
        data: {
          ...r,
          like_count: r.reel_likes?.length ?? 0,
          liked: !!r.reel_likes?.some((l: any) => l.user_id === user?.id),
          comment_count: r.reel_comments?.length ?? 0,
        },
      }));
      return [...posts, ...reels].sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      );
    },
  });

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").neq("id", user!.id).limit(8);
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <AnnouncementsBar />
      <StoryStrip />
      {isLoading && <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && items && items.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No posts yet. Be the first!</p>
          <Link to="/create" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary">
            Create a post
          </Link>
          {suggestions && suggestions.length > 0 && (
            <div className="mt-8 text-left">
              <h2 className="px-4 text-sm font-semibold text-muted-foreground">Discover people</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 px-4">
                {suggestions.map((p: any) => (
                  <Link
                    key={p.id}
                    to="/profile/$username"
                    params={{ username: p.username }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="story-ring">
                      <div className="rounded-full bg-card p-[2px]">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-neon-violet)] to-[var(--color-neon-pink)] text-xs font-bold text-background">
                              {p.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.username}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.display_name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {items?.map((it) =>
        it.kind === "post" ? (
          <PostCard key={`p-${it.data.id}`} post={it.data} />
        ) : (
          <ReelFeedCard key={`r-${it.data.id}`} reel={it.data} />
        ),
      )}
    </AppShell>
  );
}

function ReelFeedCard({ reel }: { reel: Reel }) {
  const ref = useRef<HTMLVideoElement>(null);
  const premium = (reel.profile as any)?.super_reelflex;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  async function share() {
    const url = `${window.location.origin}/r/${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "ReelFlex", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  }

  return (
    <article className="border-b border-border/60 pb-3">
      <header className="flex items-center justify-between px-3 py-2">
        <Link to="/profile/$username" params={{ username: reel.profile?.username ?? "" }} className="flex items-center gap-2">
          <Avatar url={reel.profile?.avatar_url} name={reel.profile?.username} size={32} ring />
          <span className="text-sm font-semibold">@{reel.profile?.username}</span>
          {premium && <VerifiedBadge />}
        </Link>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Play className="h-3 w-3" /> Reel
        </span>
      </header>
      <Link to="/r/$reelId" params={{ reelId: reel.id }} className="block">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden bg-black">
          <video
            ref={ref}
            src={reel.video_url}
            poster={reel.thumbnail_url ?? undefined}
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      </Link>
      <div className="flex items-center gap-4 px-3 pt-2 text-sm">
        <span className="flex items-center gap-1"><Heart className={`h-5 w-5 ${reel.liked ? "fill-[var(--color-neon-pink)] text-[var(--color-neon-pink)]" : ""}`} />{reel.like_count ?? 0}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-5 w-5" />{(reel as any).comment_count ?? 0}</span>
        <button onClick={share} aria-label="Share" className="ml-auto"><Send className="h-5 w-5" /></button>
      </div>
      {reel.caption && (
        <p className="px-3 pt-1 text-sm">
          <span className="font-semibold">@{reel.profile?.username}</span> {reel.caption}
        </p>
      )}
    </article>
  );
}

