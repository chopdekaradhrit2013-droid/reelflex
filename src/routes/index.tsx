import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReelFlex — Reels, posts, stories & chat" },
      { name: "description", content: "Share reels, posts, stories and chat with friends on ReelFlex." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/feed" : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="story-ring">
          <div className="rounded-full bg-background p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight brand-gradient-text">ReelFlex</h1>
      </div>
    </div>
  );
}
