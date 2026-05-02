"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

type TabId = "home" | "favorites" | "post" | "me";

// アクティブ時の色
const ACTIVE_COLOR = "#D4537E";
const INACTIVE_COLOR = "#9CA3AF";

const TABS: {
  id: TabId;
  href: string;
  label: string;
  primary?: boolean;
  icon: (active: boolean) => React.ReactNode;
}[] = [
  {
    id: "home",
    href: "/",
    label: "ホーム",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    ),
  },
  {
    id: "favorites",
    href: "/favorites",
    label: "お気に入り",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={active ? ACTIVE_COLOR : "none"}
        stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: "post",
    href: "/post",
    label: "投稿",
    primary: true,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#FFFFFF" : "#FFFFFF"}
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: "me",
    href: "/me",
    label: "マイページ",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export const BOTTOM_NAV_HEIGHT = 76;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid #E5E5E5",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 8px 6px",
        }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.id} href={tab.href} style={{ textDecoration: "none" }}>
              <motion.div
                whileTap={{ scale: 0.88 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 56,
                  padding: "4px 0",
                  gap: 3,
                  cursor: "pointer",
                }}
              >
                {tab.primary ? (
                  /* 投稿ボタンだけ丸いピンクボタン */
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#D4537E",
                      boxShadow: "0 4px 14px rgba(212,83,126,0.40)",
                    }}
                  >
                    {tab.icon(active)}
                  </div>
                ) : (
                  tab.icon(active)
                )}
                <span
                  style={{
                    fontSize: 9,
                    color: active ? ACTIVE_COLOR : INACTIVE_COLOR,
                    letterSpacing: "0.02em",
                    fontWeight: active ? 700 : 400,
                    transition: "color 0.2s ease",
                  }}
                >
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
