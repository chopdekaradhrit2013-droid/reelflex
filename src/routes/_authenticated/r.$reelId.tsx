import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Avatar } from "@/components/app-shell";
import { db } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/r/$reelId")({
  head: () => ({ meta: [{ title: "Reel — ReelFlex" }] }),
  component: ReelDetail,
});

function ReelDetail() {
  const { reelId } = Route.useParams();

  const { data: reel, isLoading } = useQuery({
    queryKey: ["reel", reelId],
    queryFn: async () => {
      const { data } = await db
        .from("reels")
        .select("*, profile:profiles(*)")
        .eq("id", reelId)
        .maybeSingle();
      return data;
    },
  });

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: "Reel on ReelFlex" });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  }

  return (
    <AppShell>
      {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !reel && <div className="p-8 text-center text-sm text-muted-foreground">Reel not found</div>}
      {reel && (
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[500px] overflow-hidden bg-black">
          <video src={reel.video_url} controls autoPlay loop playsInline className="h-full w-full object-contain" />
          <div className="absolute bottom-3 left-3 right-12 flex items-center gap-2 text-white">
            <Link to="/profile/$username" params={{ username: reel.profile?.username ?? "" }}>
              <Avatar url={reel.profile?.avatar_url} name={reel.profile?.username} size={32} ring />
            </Link>
            <Link
              to="/profile/$username"
              params={{ username: reel.profile?.username ?? "" }}
              className="text-sm font-semibold drop-shadow"
            >
              @{reel.profile?.username}
            </Link>
            {reel.caption && <span className="ml-2 truncate text-xs opacity-90">{reel.caption}</span>}
          </div>
          <button
            onClick={share}
            aria-label="Share"
            className="absolute bottom-3 right-3 rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}
