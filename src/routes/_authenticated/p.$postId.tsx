import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { db, type Post } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/p/$postId")({
  head: () => ({ meta: [{ title: "Post — ReelFlex" }] }),
  component: PostDetail,
});

function PostDetail() {
  const { postId } = Route.useParams();
  const { user } = useAuth();

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: async (): Promise<Post | null> => {
      const { data } = await db
        .from("posts")
        .select("*, profile:profiles(*), post_likes(user_id), comments(id)")
        .eq("id", postId)
        .maybeSingle();
      if (!data) return null;
      return {
        ...data,
        like_count: data.post_likes?.length ?? 0,
        liked: !!data.post_likes?.some((l: any) => l.user_id === user?.id),
        comment_count: data.comments?.length ?? 0,
      };
    },
  });

  return (
    <AppShell>
      {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !post && <div className="p-8 text-center text-sm text-muted-foreground">Post not found</div>}
      {post && <PostCard post={post} />}
    </AppShell>
  );
}
