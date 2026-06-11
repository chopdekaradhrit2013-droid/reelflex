import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, type Post } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { Avatar } from "./app-shell";
import { toast } from "sonner";

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (post.liked) {
        await db.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await db.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onMutate: () => {
      qc.setQueryData<Post[]>(["feed"], (old) =>
        old?.map((p) =>
          p.id === post.id
            ? { ...p, liked: !p.liked, like_count: (p.like_count ?? 0) + (p.liked ? -1 : 1) }
            : p,
        ),
      );
    },
    onError: () => toast.error("Could not update like"),
  });

  const comments = useQuery({
    queryKey: ["comments", post.id],
    enabled: showComments,
    queryFn: async () => {
      const { data } = await db
        .from("comments")
        .select("*, profile:profiles(*)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;
      await db.from("comments").insert({ post_id: post.id, user_id: user.id, text: commentText.trim() });
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.setQueryData<Post[]>(["feed"], (old) =>
        old?.map((p) => (p.id === post.id ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p)),
      );
    },
  });

  return (
    <article className="border-b border-border/60 pb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to="/profile/$username" params={{ username: post.profile?.username ?? "" }}>
          <Avatar url={post.profile?.avatar_url} name={post.profile?.username} size={36} ring />
        </Link>
        <Link
          to="/profile/$username"
          params={{ username: post.profile?.username ?? "" }}
          className="text-sm font-semibold"
        >
          {post.profile?.username}
        </Link>
      </div>

      <div className="aspect-square w-full overflow-hidden bg-muted">
        <img src={post.image_url} alt={post.caption ?? "post"} className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="flex items-center gap-4 px-4 pt-3">
        <button onClick={() => toggleLike.mutate()} aria-label="Like" className="transition active:scale-90">
          <Heart className={`h-6 w-6 ${post.liked ? "fill-[var(--color-neon-pink)] text-[var(--color-neon-pink)]" : ""}`} />
        </button>
        <button onClick={() => setShowComments((s) => !s)} aria-label="Comments">
          <MessageCircle className="h-6 w-6" />
        </button>
        <Link to="/messages" aria-label="Share" className="ml-auto">
          <Send className="h-6 w-6" />
        </Link>
      </div>

      <div className="px-4 pt-2 text-sm font-semibold">{post.like_count ?? 0} likes</div>

      {post.caption && (
        <div className="px-4 pt-1 text-sm">
          <span className="font-semibold">{post.profile?.username}</span>{" "}
          <span className="text-foreground/90">{post.caption}</span>
        </div>
      )}

      <button
        onClick={() => setShowComments((s) => !s)}
        className="px-4 pt-1 text-xs text-muted-foreground"
      >
        {showComments ? "Hide comments" : `View all ${post.comment_count ?? 0} comments`}
      </button>

      {showComments && (
        <div className="mt-2 space-y-2 px-4">
          {comments.data?.map((c: any) => (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              <span className="font-semibold">{c.profile?.username}</span>
              <span className="text-foreground/90">{c.text}</span>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addComment.mutate();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border border-input bg-input/40 px-4 py-2 text-sm outline-none focus:ring-2 ring-ring"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-sm font-semibold text-primary disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
