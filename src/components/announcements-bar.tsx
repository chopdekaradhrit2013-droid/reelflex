import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { db, supabase } from "@/lib/db";
import { useMyMeta } from "@/lib/use-profile";
import { toast } from "sonner";

export function AnnouncementsBar() {
  const qc = useQueryClient();
  const { data: me } = useMyMeta();

  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await db
        .from("announcements")
        .select("*, profile:profiles(username, super_reelflex)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("announcements-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        qc.invalidateQueries({ queryKey: ["announcements"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: any) => toast.error(e.message ?? "Couldn't delete"),
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2 px-3 pt-3">
      {data.map((a: any) => (
        <div
          key={a.id}
          className="relative flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "rgba(255,215,0,0.6)",
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 10%, var(--card)), color-mix(in oklab, #ffd34d 10%, transparent))",
          }}
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#ffd34d" }} />
          <div className="flex-1">
            <div className="text-[11px] opacity-70">@{a.profile?.username} · announcement</div>
            <div className="whitespace-pre-wrap">{a.text}</div>
          </div>
          {me?.role === "super_admin" && (
            <button onClick={() => del.mutate(a.id)} aria-label="Delete" className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
