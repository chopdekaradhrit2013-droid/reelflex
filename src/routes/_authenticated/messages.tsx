import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Avatar } from "@/components/app-shell";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — ReelFlex" }] }),
  component: Inbox,
});

function Inbox() {
  const { user } = useAuth();

  const { data: threads } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      const lastByPeer = new Map<string, any>();
      for (const m of data ?? []) {
        const peer = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!lastByPeer.has(peer)) lastByPeer.set(peer, m);
      }
      const peerIds = Array.from(lastByPeer.keys());
      if (peerIds.length === 0) return [];
      const { data: profiles } = await db.from("profiles").select("*").in("id", peerIds);
      return peerIds.map((id) => ({
        peer: (profiles ?? []).find((p: any) => p.id === id),
        last: lastByPeer.get(id),
      }));
    },
  });

  const { data: people } = useQuery({
    queryKey: ["all-people", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").neq("id", user!.id).limit(20);
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        {threads && threads.length > 0 ? (
          <div className="mt-4 divide-y divide-border/60">
            {threads.map((t: any) => (
              <Link
                key={t.peer?.id}
                to="/messages/$userId"
                params={{ userId: t.peer?.id }}
                className="flex items-center gap-3 py-3"
              >
                <Avatar url={t.peer?.avatar_url} name={t.peer?.username} size={48} ring />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.peer?.username}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.last?.text}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No conversations yet. Start one below.</p>
        )}

        <h2 className="mt-8 text-sm font-semibold text-muted-foreground">People</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {people?.map((p: any) => (
            <Link
              key={p.id}
              to="/messages/$userId"
              params={{ userId: p.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Avatar url={p.avatar_url} name={p.username} size={40} ring />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.username}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
