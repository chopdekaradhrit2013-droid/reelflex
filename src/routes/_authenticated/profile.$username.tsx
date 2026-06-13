import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Grid3x3, Film, Sparkles } from "lucide-react";
import { AppShell, Avatar } from "@/components/app-shell";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { VerifiedBadge, PremiumLabel } from "@/components/premium-badge";


export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — ReelFlex` }] }),
  component: Profile,
});

function Profile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });

  const isMe = user?.id === profile?.id;

  const { data: posts } = useQuery({
    queryKey: ["user-posts", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await db.from("posts").select("*").eq("user_id", profile!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: reels } = useQuery({
    queryKey: ["user-reels", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await db.from("reels").select("*").eq("user_id", profile!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", profile?.id, user?.id],
    enabled: !!profile && !!user,
    queryFn: async () => {
      const [{ data: followers }, { data: following }, { data: mine }] = await Promise.all([
        db.from("follows").select("follower_id").eq("following_id", profile!.id),
        db.from("follows").select("following_id").eq("follower_id", profile!.id),
        db.from("follows").select("follower_id").eq("follower_id", user!.id).eq("following_id", profile!.id),
      ]);
      return {
        followers: followers?.length ?? 0,
        following: following?.length ?? 0,
        amFollowing: (mine?.length ?? 0) > 0,
      };
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      if (stats?.amFollowing) {
        await db.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      } else {
        await db.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-stats", profile?.id, user?.id] }),
    onError: () => toast.error("Could not update follow"),
  });

  if (!profile) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Profile not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4">
        <div className="flex items-center gap-5">
          {profile.super_reelflex ? (
            <div className="royal-ring" style={{ width: 96, height: 96 }}>
              <div className="rounded-full bg-background p-[2px]" style={{ width: 90, height: 90 }}>
                <div className="h-full w-full overflow-hidden rounded-full">
                  <Avatar url={profile.avatar_url} name={profile.username} size={86} />
                </div>
              </div>
            </div>
          ) : (
            <Avatar url={profile.avatar_url} name={profile.username} size={88} ring />
          )}
          <div className="flex flex-1 justify-around text-center text-sm">
            <Stat n={posts?.length ?? 0} label="Posts" />
            <Stat n={stats?.followers ?? 0} label="Followers" />
            <Stat n={stats?.following ?? 0} label="Following" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className={profile.super_reelflex ? "golden-text" : ""}>{profile.display_name || profile.username}</span>
            {profile.super_reelflex && <VerifiedBadge />}
            {profile.super_reelflex && <PremiumLabel />}
          </div>
          <div className="text-xs text-muted-foreground">@{profile.username}</div>
          {profile.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
        </div>

        <div className="mt-4 flex gap-2">
          {isMe ? (
            <>
              <Link
                to="/settings"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted py-2 text-sm font-semibold"
              >
                <SettingsIcon className="h-4 w-4" /> Settings
              </Link>
              {profile.super_reelflex && (
                <Link
                  to="/emojify"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg,#ffd34d,#b8860b)", color: "#fff" }}
                >
                  <Sparkles className="h-4 w-4" /> Emojify
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => toggleFollow.mutate()}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                  stats?.amFollowing ? "bg-muted text-foreground" : "bg-primary text-primary-foreground glow-primary"
                }`}
              >
                {stats?.amFollowing ? "Following" : "Follow"}
              </button>
              <Link
                to="/messages/$userId"
                params={{ userId: profile.id }}
                className="flex-1 rounded-xl bg-muted py-2 text-center text-sm font-semibold"
              >
                Message
              </Link>
            </>
          )}
        </div>


        <div className="mt-6 flex items-center gap-2 border-b border-border/60 pb-2 text-xs uppercase text-muted-foreground">
          <Grid3x3 className="h-4 w-4" /> Posts <span className="mx-2">·</span>
          <Film className="h-4 w-4" /> Reels
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1">
          {posts?.map((p: any) => (
            <div key={p.id} className="aspect-square overflow-hidden rounded bg-muted">
              <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
          {reels?.map((r: any) => (
            <Link
              key={r.id}
              to="/reels"
              className="relative aspect-square overflow-hidden rounded bg-black"
            >
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} className="h-full w-full object-cover" alt="" />
              ) : (
                <video src={r.video_url} className="h-full w-full object-cover" muted />
              )}
              <Film className="absolute right-1 top-1 h-4 w-4 text-white drop-shadow" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
