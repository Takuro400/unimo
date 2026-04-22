"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface BottomNavProps {
  active: "home" | "login";
}

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(to top, #0D0D0F 60%, transparent)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="glass mx-4 mb-4 rounded-2xl px-8 py-3 flex items-center justify-around"
        style={{ border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="flex flex-col items-center gap-1 cursor-pointer"
            style={{ minWidth: 48 }}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={active === "home" ? "#A78BFA" : "rgba(255,255,255,0.35)"}
              strokeWidth="1.5"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span style={{ fontSize: 10, color: active === "home" ? "#A78BFA" : "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
              ホーム
            </span>
          </motion.div>
        </Link>

        <Link href="/login" style={{ textDecoration: "none" }}>
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="flex flex-col items-center gap-1 cursor-pointer"
            style={{ minWidth: 48 }}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={active === "login" ? "#A78BFA" : "rgba(255,255,255,0.35)"}
              strokeWidth="1.5"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span style={{ fontSize: 10, color: active === "login" ? "#A78BFA" : "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
              ログイン
            </span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
