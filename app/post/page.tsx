"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES } from "@/lib/mock-data";
import type { Circle } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function PostPickCirclePage() {
  const user = useAuth();
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase && user.id !== "dev-user") {
        const { data } = await supabase
          .from("circle_members")
          .select("circle:circles(*)")
          .eq("user_id", user.id);
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMyCircles(data.map((r: any) => r.circle).filter(Boolean));
        }
      } else {
        setMyCircles(MOCK_CIRCLES.slice(0, 3));
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div style={{ background: "#0D0D0F", minHeight: "100svh" }}>
      <div
        style={{
          padding: "48px 20px 16px",
          background: "linear-gradient(to bottom, rgba(13,13,15,0.85) 0%, transparent 100%)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-widest silver-text">投稿</h1>
        <p
          className="text-xs mt-1"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}
        >
          どのサークルに投稿しますか?
        </p>
      </div>

      <div className="px-4 pb-32">
        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : myCircles.length === 0 ? (
          <div
            className="glass rounded-2xl p-8 flex flex-col items-center text-center mt-6"
            style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            <span style={{ fontSize: 28, opacity: 0.3 }}>🎫</span>
            <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              参加しているサークルがありません
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              招待コードでサークルに参加すると<br />ここから投稿できるようになります
            </p>
            <Link href="/" style={{ textDecoration: "none", marginTop: 20 }}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="rounded-xl px-5 py-2.5"
                style={{
                  background: "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(167,139,250,0.08))",
                  border: "1px solid rgba(167,139,250,0.35)",
                  color: "#C4B5FD",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                ホームに戻る
              </motion.div>
            </Link>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {myCircles.map((c, i) => (
              <Link
                key={c.id}
                href={`/circle/${c.id}/post`}
                style={{ textDecoration: "none" }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass rounded-2xl p-4 flex items-center gap-3"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer",
                  }}
                >
                  {c.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.icon_url}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      {c.emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{ fontSize: 14, color: "#E0E0E8", fontWeight: 600 }}
                    >
                      {c.name}
                    </p>
                    {c.category && (
                      <span
                        className="inline-block mt-0.5 rounded-full px-2 py-0.5"
                        style={{
                          fontSize: 10,
                          background: "rgba(167,139,250,0.10)",
                          color: "rgba(167,139,250,0.8)",
                          border: "1px solid rgba(167,139,250,0.2)",
                        }}
                      >
                        {c.category}
                      </span>
                    )}
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
