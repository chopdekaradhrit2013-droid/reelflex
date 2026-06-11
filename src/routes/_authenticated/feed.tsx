import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StoryStrip } from "@/components/story-strip";
import { PostCard } from "@/components/post-card";
import { db, type Post } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — ReelFlex" }] }),
  component: Feed,
});

function Feed() {
  const { user } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed"],
    enabled: !!user,
    queryFn: async (): Promise<Post[]> => {
      const { data } = await db
        .from("posts")
        .select("*, profile:profiles(*), post_likes(user_id), comments(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).map((p: any) => ({
        ...p,
        like_count: p.post_likes?.length ?? 0,
        liked: !!p.post_likes?.some((l: any) => l.user_id === user?.id),
        comment_count: p.comments?.length ?? 0,
      }));
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
      <StoryStrip />
      {isLoading && <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && posts && posts.length === 0 && (
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
      {posts?.map((p) => <PostCard key={p.id} post={p} />)}
    </AppShell>
  );
}
