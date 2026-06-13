import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/banned")({
  head: () => ({ meta: [{ title: "Account suspended — ReelFlex" }] }),
  component: Banned,
});

function Banned() {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm rounded-2xl border border-destructive/40 bg-card p-6 text-center">
        <Ban className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-bold">Account suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has been deactivated by an administrator. Please contact support to appeal.
        </p>
        <button onClick={logout} className="mt-5 w-full rounded-xl bg-muted py-2 text-sm font-semibold">
          Sign out
        </button>
      </div>
    </div>
  );
}
