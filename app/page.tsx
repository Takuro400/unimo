"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { MOCK_CIRCLES } from "@/lib/mock-data";
import type { Circle } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  "文化系": "rgba(167,139,250,0.10)",
  "体育系": "rgba(192,192,200,0.08)",
  "技術系": "rgba(100,180,220,0.08)",
};

const GRADIENTS = [
  "from-slate-700 to-slate-900",
  "from-zinc-700 to-zinc-900",
  "from-neutral-700 to-neutral-900",
  "from-stone-700 to-stone-900",
  "from-gray-700 to-gray-900",
  "from-slate-600 to-slate-800",
  "from-zinc-600 to-zinc-800",
  "from-neutral-600 to-neutral-800",
];

export default function Home() {
  const user = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (supabase) {
        const { data } = await supabase.from("circles").select("*").order("created_at", { ascending: false });
        setCircles(data?.length ? data : MOCK_CIRCLES);
      } else {
        setCircles(MOCK_CIRCLES);
      }
      setDataLoading(false);
    })();
  }, [user]);

  // Loading / auth-pending state
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "rgba(255,255,255,0.5)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-5 pt-12 pb-4"
        style={{ background: "linear-gradient(to bottom, #0D0D0F 80%, transparent)" }}
      >
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-widest silver-text"
          >
            UniMo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {user?.email?.split("@")[0]}
          </motion.p>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs mt-0.5"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          九工大サークル・部活動の記録
        </motion.p>
      </div>

      {/* Circle grid */}
      <div className="flex-1 px-3 pb-28">
        {dataLoading ? (
          <div className="flex justify-center pt-16">
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "rgba(255,255,255,0.5)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="flex gap-3">
            {/* Left column */}
            <div className="flex-1">
              {circles.filter((_, i) => i % 2 === 0).map((circle, i) => (
                <CircleCard key={circle.id} circle={circle} index={i * 2} />
              ))}
            </div>
            {/* Right column */}
            <div className="flex-1 pt-6">
              {circles.filter((_, i) => i % 2 === 1).map((circle, i) => (
                <CircleCard key={circle.id} circle={circle} index={i * 2 + 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB: サークルを登録 */}
      <div className="fixed bottom-8 right-5 z-50">
        <Link href="/circle/new">
          <motion.div
            whileTap={{ scale: 0.94 }}
            className="glass rounded-2xl flex items-center gap-2 px-4 py-3 cursor-pointer"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.07)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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

function CircleCard({ circle, index }: { circle: Circle; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.97 }}
      className="mb-3"
    >
      <Link href={`/circle/${circle.id}`} style={{ textDecoration: "none" }}>
        <div
          className="glass rounded-2xl overflow-hidden"
          style={{ background: CATEGORY_COLORS[circle.category ?? ""] }}
        >
          {/* Visual */}
          <div
            className={`w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
            style={{ height: 110 }}
          >
            <span style={{ fontSize: 40, opacity: 0.4 }}>{circle.emoji}</span>
            {circle.category && (
              <div
                className="absolute top-2 left-2.5 glass rounded-full px-2 py-0.5"
                style={{ border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{circle.category}</span>
              </div>
            )}
          </div>
          {/* Info */}
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--silver-bright)" }}>
              {circle.name}
            </p>
            {circle.description && (
              <p
                className="text-xs mt-0.5"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {circle.description}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
