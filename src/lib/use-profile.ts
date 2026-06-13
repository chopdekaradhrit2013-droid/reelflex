import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/use-auth";

export type Role = "super_admin" | "admin" | "user";

export type MyMeta = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  super_reelflex: boolean;
  is_banned: boolean;
  role: Role;
};

export function useMyMeta() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-meta", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyMeta | null> => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        db.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        db.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      if (!profile) return null;
      let role: Role = "user";
      const rs = (roles ?? []).map((r: any) => r.role);
      if (rs.includes("super_admin")) role = "super_admin";
      else if (rs.includes("admin")) role = "admin";
      return { ...profile, role };
    },
  });
}

export function isAdminRole(r?: Role) {
  return r === "admin" || r === "super_admin";
}
