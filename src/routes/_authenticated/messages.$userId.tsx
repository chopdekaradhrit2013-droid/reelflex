import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar } from "@/components/app-shell";
import { db, supabase, type Message } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — ReelFlex" }] }),
  component: Chat,
});

function Chat() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: peer } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["dm", user?.id, userId],
    enabled: !!user,
    queryFn: async (): Promise<Message[]> => {
      const { data } = await db
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user!.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm:${user.id}:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const between =
            (m.sender_id === user.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === user.id);
          if (!between) return;
          qc.setQueryData<Message[]>(["dm", user.id, userId], (old) => {
            if (old?.some((x) => x.id === m.id)) return old;
            return [...(old ?? []), m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !text.trim()) return;
      const t = text.trim();
      setText("");
      await db.from("messages").insert({ sender_id: user.id, recipient_id: userId, text: t });
    },
  });

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur">
        <Link to="/messages" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {peer && (
          <Link to="/profile/$username" params={{ username: peer.username }} className="flex items-center gap-2">
            <Avatar url={peer.avatar_url} name={peer.username} size={36} ring />
            <span className="text-sm font-semibold">{peer.username}</span>
          </Link>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {messages && messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">Say hi 👋</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
        className="sticky bottom-0 flex items-center gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
