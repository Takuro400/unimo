export interface Circle {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Post {
  id: string;
  circle_id: string;
  posted_by: string | null;
  month: number;
  year: number;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}
