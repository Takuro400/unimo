"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

type TabId = "home" | "favorites" | "post" | "me";

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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C4B5FD" : "rgba(255,255,255,0.4)"} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#D4537E" : "none"} stroke={active ? "#D4537E" : "rgba(255,255,255,0.4)"} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#E9E0FF" : "#C4B5FD"} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#C4B5FD" : "rgba(255,255,255,0.4)"} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(to top, #0D0D0F 60%, transparent)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="glass mx-4 mb-4 rounded-2xl px-2 py-2 flex items-center justify-around"
        style={{ border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const textColor = tab.id === "favorites" && active
            ? "#D4537E"
            : active
            ? "#C4B5FD"
            : "rgba(255,255,255,0.35)";
          return (
            <Link key={tab.id} href={tab.href} style={{ textDecoration: "none" }}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center cursor-pointer"
                style={{ minWidth: 48, padding: "4px 0", gap: 3 }}
              >
                {tab.primary ? (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active
                        ? "linear-gradient(135deg, rgba(167,139,250,0.35), rgba(167,139,250,0.18))"
                        : "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(167,139,250,0.08))",
                      border: "1px solid rgba(167,139,250,0.4)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.3), 0 0 12px rgba(167,139,250,0.15)",
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
                    color: textColor,
                    letterSpacing: "0.02em",
                    fontWeight: active ? 600 : 400,
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
