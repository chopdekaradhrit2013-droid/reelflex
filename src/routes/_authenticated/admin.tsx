import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Shield, ShieldOff, Ban, Gift, Trash2, Crown } from "lucide-react";
import { AppShell, Avatar } from "@/components/app-shell";
import { db } from "@/lib/db";
import { useMyMeta, isAdminRole } from "@/lib/use-profile";
import { VerifiedBadge, PremiumLabel } from "@/components/premium-badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ReelFlex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useMyMeta();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && me && !isAdminRole(me.role)) navigate({ to: "/feed", replace: true });
  }, [me, isLoading, navigate]);

  if (!me || !isAdminRole(me.role)) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const isSuper = me.role === "super_admin";

  return (
    <AppShell>
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6" style={{ color: "#ffd34d" }} />
          <h1 className="text-2xl font-bold">Control Center</h1>
        </div>

        <AnnouncementComposer />

        <UsersSection isSuper={isSuper} myId={me.id} />

        <ContentSection kind="posts" title="Recent posts" isSuper={isSuper} />
        <ContentSection kind="reels" title="Recent reels" isSuper={isSuper} />
      </div>
    </AppShell>
  );
}

function AnnouncementComposer() {
  const { data: me } = useMyMeta();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      if (!me) return;
      const { error } = await db.from("announcements").insert({ user_id: me.id, text: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      toast.success("Announcement broadcast for 24 hours");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(255,215,0,0.5)" }}>
      <div className="mb-2 flex items-center gap-2">
        <Megaphone className="h-4 w-4" style={{ color: "#ffd34d" }} />
        <h2 className="text-sm font-semibold">Make an announcement</h2>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something with everyone (visible 24h)…"
        rows={3}
        maxLength={500}
        className="w-full rounded-xl border border-input bg-input/40 px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
      />
      <button
        onClick={() => create.mutate()}
        disabled={!text.trim() || create.isPending}
        className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#ffd34d,#b8860b)", color: "#fff" }}
      >
        Broadcast
      </button>
    </section>
  );
}

function UsersSection({ isSuper, myId }: { isSuper: boolean; myId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await db
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const { data: roles } = await db.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => {
        const cur = roleMap.get(r.user_id);
        const order = (x: string) => (x === "super_admin" ? 3 : x === "admin" ? 2 : 1);
        if (!cur || order(r.role) > order(cur)) roleMap.set(r.user_id, r.role);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "user" }));
    },
  });

  const setBan = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const { error } = await db.from("profiles").update({ is_banned: banned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const setPremium = useMutation({
    mutationFn: async ({ id, premium }: { id: string; premium: boolean }) => {
      const { error } = await db.from("profiles").update({ super_reelflex: premium }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await db.from("user_roles").insert({ user_id: id, role: "admin" });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
        await db.from("profiles").update({ super_reelflex: true }).eq("id", id);
      } else {
        const { error } = await db.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (users ?? []).filter((u: any) =>
    !q || u.username?.toLowerCase().includes(q.toLowerCase()) || u.display_name?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Users</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users…"
        className="mb-3 w-full rounded-xl border border-input bg-input/40 px-3 py-2 text-sm outline-none"
      />
      <div className="space-y-2">
        {filtered.map((u: any) => {
          const targetIsSuper = u.role === "super_admin";
          const targetIsAdmin = u.role === "admin";
          const isSelf = u.id === myId;
          return (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
              <Link to="/profile/$username" params={{ username: u.username }}>
                <Avatar url={u.avatar_url} name={u.username} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  @{u.username} {u.super_reelflex && <VerifiedBadge />} {u.super_reelflex && <PremiumLabel />}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{u.display_name}</div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {!targetIsSuper && !isSelf && (
                  <button
                    onClick={() => setBan.mutate({ id: u.id, banned: !u.is_banned })}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                      u.is_banned ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    <Ban className="h-3 w-3" /> {u.is_banned ? "Unban" : "Ban"}
                  </button>
                )}
                {!u.super_reelflex && (
                  <button
                    onClick={() => setPremium.mutate({ id: u.id, premium: true })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold"
                    style={{ background: "linear-gradient(135deg,#ffd34d,#b8860b)", color: "#fff" }}
                  >
                    <Gift className="h-3 w-3" /> Gift Super
                  </button>
                )}
                {isSuper && !targetIsSuper && !isSelf && (
                  <button
                    onClick={() => setRole.mutate({ id: u.id, makeAdmin: !targetIsAdmin })}
                    className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold"
                  >
                    {targetIsAdmin ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {targetIsAdmin ? "Remove admin" : "Make admin"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ContentSection({ kind, title, isSuper }: { kind: "posts" | "reels"; title: string; isSuper: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-content", kind],
    queryFn: async () => {
      const { data } = await db
        .from(kind)
        .select("*, profile:profiles(username)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(kind).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content", kind] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isSuper) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-3 gap-2">
        {data?.map((item: any) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded bg-muted">
            {kind === "posts" ? (
              <img src={item.image_url} className="h-full w-full object-cover" alt="" />
            ) : (
              <video src={item.video_url} className="h-full w-full object-cover" muted />
            )}
            <div className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1 text-[10px] text-white">
              @{item.profile?.username}
            </div>
            <button
              onClick={() => del.mutate(item.id)}
              className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground"
              aria-label="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
