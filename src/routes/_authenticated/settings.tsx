import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ReelFlex" }] }),
  component: Settings,
});

function Settings() {
  const { mode, setMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    db.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }: any) => {
      if (!data) return;
      setDisplayName(data.display_name ?? "");
      setBio(data.bio ?? "");
      setAvatar(data.avatar_url ?? "");
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await db
      .from("profiles")
      .update({ display_name: displayName, bio, avatar_url: avatar || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries();
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <div className="space-y-6 p-4">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            <ThemeButton active={mode === "light"} onClick={() => setMode("light")} icon={<Sun className="h-4 w-4" />} label="Light" />
            <ThemeButton active={mode === "dark"} onClick={() => setMode("dark")} icon={<Moon className="h-4 w-4" />} label="Dark" />
            <ThemeButton active={mode === "system"} onClick={() => setMode("system")} icon={<Monitor className="h-4 w-4" />} label="System" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Edit profile</h2>
          <form onSubmit={save} className="space-y-3">
            <input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
            />
            <input
              placeholder="Avatar URL (https://…)"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
            />
            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full rounded-xl border border-input bg-input/40 px-4 py-3 text-sm outline-none focus:ring-2 ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
        </section>

        <section>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
