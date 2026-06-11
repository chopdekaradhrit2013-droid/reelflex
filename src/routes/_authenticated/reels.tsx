import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { db, type Reel } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { Avatar } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/reels")({
  head: () => ({ meta: [{ title: "Reels — ReelFlex" }] }),
  component: ReelsPage,
});

function ReelsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reels } = useQuery({
    queryKey: ["reels"],
    enabled: !!user,
    queryFn: async (): Promise<Reel[]> => {
      const { data } = await db
        .from("reels")
        .select("*, profile:profiles(*), reel_likes(user_id)")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []).map((r: any) => ({
        ...r,
        like_count: r.reel_likes?.length ?? 0,
        liked: !!r.reel_likes?.some((l: any) => l.user_id === user?.id),
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
            <ReelView key={r.id} reel={r} onLike={() => toggleLike.mutate(r)} />
          ))
        )}
      </div>
    </div>
  );
}

function ReelView({ reel, onLike }: { reel: Reel; onLike: () => void }) {
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
        </Link>
        {reel.caption && <p className="mt-2 text-sm">{reel.caption}</p>}
      </div>
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <Heart className={`h-8 w-8 ${reel.liked ? "fill-[var(--color-neon-pink)] text-[var(--color-neon-pink)]" : ""}`} />
          <span className="text-xs">{reel.like_count ?? 0}</span>
        </button>
        <MessageCircle className="h-8 w-8" />
        <Share2 className="h-8 w-8" />
      </div>
    </section>
  );
}
