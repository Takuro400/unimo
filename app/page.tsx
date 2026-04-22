"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES, MOCK_POSTS } from "@/lib/mock-data";
import type { Circle, Post } from "@/lib/types";

type FeedPost = Post & { circle: Circle };

const GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-violet-900 to-slate-900",
  "from-zinc-700 to-zinc-900",
  "from-stone-700 to-stone-900",
  "from-neutral-800 to-zinc-900",
  "from-gray-700 to-gray-900",
  "from-zinc-800 to-slate-900",
  "from-slate-600 to-zinc-900",
];

function buildMockFeed(): FeedPost[] {
  const circleMap = Object.fromEntries(MOCK_CIRCLES.map((c) => [c.id, c]));
  return Object.values(MOCK_POSTS)
    .flat()
    .filter((p) => circleMap[p.circle_id])
    .map((p) => ({ ...p, circle: circleMap[p.circle_id] }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function Home() {
  const user = useAuth();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase) {
        const { data } = await supabase
          .from("posts")
          .select("*, circles(*)")
          .order("created_at", { ascending: false });

        if (data?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setFeed(data.map((p: any) => ({ ...p, circle: p.circles })));
        } else {
          setFeed(buildMockFeed());
        }
      } else {
        setFeed(buildMockFeed());
      }
      setDataLoading(false);
    })();
  }, [user]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D0D0F", height: "100svh", overflow: "hidden", position: "relative" }}>
      {/* Floating header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "48px 20px 16px",
          background: "linear-gradient(to bottom, rgba(13,13,15,0.85) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-widest silver-text">UniMo</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {user?.email?.split("@")[0]}
          </p>
        </div>
      </div>

      {/* Feed */}
      {dataLoading ? (
        <div className="flex items-center justify-center" style={{ height: "100svh" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex items-center justify-center flex-col gap-3" style={{ height: "100svh" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>まだ投稿がありません</p>
          <Link href="/circle/new">
            <span style={{ color: "#A78BFA", fontSize: 13 }}>サークルを登録する →</span>
          </Link>
        </div>
      ) : (
        <div
          style={{
            height: "100svh",
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
          }}
        >
          {feed.map((post, i) => (
            <FeedCard key={post.id} post={post} index={i} />
          ))}
          <div style={{ height: "20svh", flexShrink: 0 }} />
        </div>
      )}

      {/* FAB */}
      <div style={{ position: "fixed", bottom: 32, right: 20, zIndex: 50 }}>
        <Link href="/circle/new">
          <motion.div
            whileTap={{ scale: 0.94 }}
            className="glass rounded-2xl flex items-center gap-2 px-4 py-3 cursor-pointer"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(13,13,15,0.7)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }}>＋</span>
            <span style={{ fontSize: 13, color: "var(--silver-bright)", letterSpacing: "0.03em" }}>
              サークルを登録
            </span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}

function FeedCard({ post, index }: { post: FeedPost; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <Link href={`/circle/${post.circle_id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          width: "100%",
          height: "80svh",
          scrollSnapAlign: "start",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Photo or gradient placeholder */}
        {post.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt={post.caption ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            className={`bg-gradient-to-br ${gradient}`}
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span style={{ fontSize: 80, opacity: 0.12 }}>{post.circle.emoji}</span>
          </div>
        )}

        {/* Top overlay — circle name */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "100px 16px 24px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{post.circle.emoji}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
              {post.circle.name}
            </span>
            {post.circle.category && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(167,139,250,0.25)",
                  border: "1px solid rgba(167,139,250,0.4)",
                  color: "#C4B5FD",
                  letterSpacing: "0.04em",
                }}
              >
                {post.circle.category}
              </span>
            )}
          </div>
        </div>

        {/* Bottom overlay — caption */}
        {post.caption && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "48px 16px 24px",
              background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            }}
          >
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.55 }}>
              {post.caption}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              {post.month}月
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
