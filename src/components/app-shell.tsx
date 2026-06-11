import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Film, PlusSquare, MessageCircle, User, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";

function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
}

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { data: profile } = useMyProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link to="/feed" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xl font-bold tracking-tight brand-gradient-text">ReelFlex</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/messages" aria-label="Messages" className="rounded-full p-2 hover:bg-accent/10">
            <MessageCircle className="h-5 w-5" />
          </Link>
          {profile?.username && (
            <Link to="/profile/$username" params={{ username: profile.username }} aria-label="Profile">
              <Avatar url={profile.avatar_url} name={profile.username} size={32} />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-around px-2 py-2">
            <NavItem to="/feed" icon={<Home className="h-6 w-6" />} active={pathname === "/feed"} label="Home" />
            <NavItem to="/reels" icon={<Film className="h-6 w-6" />} active={pathname.startsWith("/reels")} label="Reels" />
            <NavItem to="/create" icon={<PlusSquare className="h-6 w-6" />} active={pathname.startsWith("/create")} label="Create" />
            <NavItem to="/messages" icon={<MessageCircle className="h-6 w-6" />} active={pathname.startsWith("/messages")} label="DMs" />
            <NavItem
              to={profile?.username ? "/profile/$username" : "/settings"}
              params={profile?.username ? { username: profile.username } : undefined}
              icon={<User className="h-6 w-6" />}
              active={pathname.startsWith("/profile") || pathname.startsWith("/settings")}
              label="Me"
            />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({
  to,
  icon,
  active,
  label,
  params,
}: {
  to: string;
  icon: ReactNode;
  active: boolean;
  label: string;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

export function Avatar({ url, name, size = 40, ring }: { url?: string | null; name?: string | null; size?: number; ring?: boolean }) {
  const initials = (name ?? "?").slice(0, 2).toUpperCase();
  const content = url ? (
    <img src={url} alt={name ?? "avatar"} className="h-full w-full rounded-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-violet)] via-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] text-xs font-semibold text-background">
      {initials}
    </div>
  );
  if (ring) {
    return (
      <div className="story-ring" style={{ width: size + 4, height: size + 4 }}>
        <div className="rounded-full bg-background p-[2px]" style={{ width: size, height: size }}>
          <div className="h-full w-full overflow-hidden rounded-full">{content}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-full" style={{ width: size, height: size }}>
      {content}
    </div>
  );
}
