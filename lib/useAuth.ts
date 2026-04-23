"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { User } from "@supabase/supabase-js";

// Returns undefined while loading, null if unauthenticated, User if logged in.
// Automatically redirects to /login when unauthenticated (Supabase configured).
export function useAuth(): User | null | undefined {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Dev mode: skip auth
      setUser({ id: "dev-user", email: "dev@mail.kyutech.ac.jp" } as User);
      return;
    }

    // 4秒以内に応答がなければログインへ
    const timeout = setTimeout(() => {
      setUser(null);
      router.replace("/login");
    }, 4000);

    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(timeout);
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) router.replace("/login");
    }).catch(() => {
      clearTimeout(timeout);
      setUser(null);
      router.replace("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) router.replace("/login");
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, [router]);

  return user;
}
