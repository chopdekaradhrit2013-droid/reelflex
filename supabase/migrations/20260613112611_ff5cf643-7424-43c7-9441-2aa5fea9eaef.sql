
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "roles readable by all authed" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS super_reelflex boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads announcements" ON public.announcements FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "admins create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND auth.uid()=user_id);
CREATE POLICY "owner or super admin deletes announce" ON public.announcements FOR DELETE TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel comments readable" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users add reel comments" ON public.reel_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_banned));
CREATE POLICY "delete own reel comment or super admin" ON public.reel_comments FOR DELETE TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "super admin deletes any post" ON public.posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR auth.uid()=user_id);
CREATE POLICY "super admin deletes any reel" ON public.reels FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR auth.uid()=user_id);

ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER TABLE public.reel_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;

DO $$
DECLARE super_id uuid; admin_id uuid;
BEGIN
  SELECT id INTO super_id FROM auth.users WHERE email='chopdekaradhrit2013@gmail.com';
  SELECT id INTO admin_id FROM auth.users WHERE email='specificpradyun76@gmail.com';
  IF super_id IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id,role) VALUES (super_id,'super_admin') ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET super_reelflex=true WHERE id=super_id;
  END IF;
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id,role) VALUES (admin_id,'admin') ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET super_reelflex=true WHERE id=admin_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  base_username TEXT; final_username TEXT; n INT := 0;
  assigned_role public.app_role := 'user';
  premium boolean := false;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1),'user');
  base_username := regexp_replace(lower(base_username),'[^a-z0-9_]','','g');
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE username=final_username) LOOP
    n := n+1; final_username := base_username || n::text;
  END LOOP;
  IF NEW.email = 'chopdekaradhrit2013@gmail.com' THEN assigned_role:='super_admin'; premium:=true;
  ELSIF NEW.email = 'specificpradyun76@gmail.com' THEN assigned_role:='admin'; premium:=true;
  END IF;
  INSERT INTO public.profiles(id,username,display_name,avatar_url,super_reelflex)
  VALUES (NEW.id, final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url', premium);
  INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id, assigned_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
