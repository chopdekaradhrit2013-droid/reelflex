import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { db } from "@/lib/db";
import { Avatar } from "./app-shell";
import { useAuth } from "@/lib/use-auth";
import { Link } from "@tanstack/react-router";

export function StoryStrip() {
  const { user } = useAuth();
  const [viewing, setViewing] = useState<any | null>(null);

  const { data: stories } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data } = await db
        .from("stories")
        .select("*, profile:profiles(*)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      // group by user, keep first per user
      const seen = new Set<string>();
      const grouped: any[] = [];
      for (const s of data ?? []) {
        if (seen.has(s.user_id)) continue;
        seen.add(s.user_id);
        grouped.push(s);
      }
      return grouped;
    },
  });

  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link to="/create" className="flex w-16 shrink-0 flex-col items-center gap-1">
        <div className="relative h-16 w-16 rounded-full border-2 border-dashed border-primary/60 p-1">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
            <Plus className="h-5 w-5 text-primary" />
          </div>
        </div>
        <span className="truncate text-[11px] text-muted-foreground">Your story</span>
      </Link>
      {stories?.map((s) => (
        <button
          key={s.id}
          onClick={() => setViewing(s)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <Avatar url={s.profile?.avatar_url} name={s.profile?.username} size={56} ring />
          <span className="w-16 truncate text-[11px] text-muted-foreground">{s.profile?.username}</span>
        </button>
      ))}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setViewing(null)}
        >
          <button className="absolute right-4 top-4 text-white" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <div className="absolute left-4 top-4 flex items-center gap-2 text-white">
            <Avatar url={viewing.profile?.avatar_url} name={viewing.profile?.username} size={32} ring />
            <span className="text-sm font-semibold">{viewing.profile?.username}</span>
          </div>
          <img src={viewing.image_url} alt="story" className="max-h-[80vh] max-w-full" />
        </div>
      )}
    </div>
  );
}
