import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyMeta } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: GateBanned,
});

function GateBanned() {
  const { data: me } = useMyMeta();
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (me?.is_banned && loc.pathname !== "/banned") {
      navigate({ to: "/banned", replace: true });
    }
  }, [me, loc.pathname, navigate]);
  return <Outlet />;
}
