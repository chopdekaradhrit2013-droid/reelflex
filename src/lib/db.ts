// Typed-relaxed wrapper around the supabase client because the generated
// Database types don't include our user tables (we keep them in code).
import { supabase } from "@/integrations/supabase/client";

export const db = supabase as unknown as {
  from: (table: string) => any;
  auth: typeof supabase.auth;
  channel: typeof supabase.channel;
  removeChannel: typeof supabase.removeChannel;
};

export { supabase };

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profile?: Profile;
  like_count?: number;
  liked?: boolean;
  comment_count?: number;
};

export type Reel = {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
  profile?: Profile;
  like_count?: number;
  liked?: boolean;
};

export type Story = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  expires_at: string;
  profile?: Profile;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
};
