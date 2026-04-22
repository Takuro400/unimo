"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CIRCLES } from "@/lib/mock-data";

const MOCK_MEMBERS = [
  { id: "u1", email: "s123456a@mail.kyutech.ac.jp", role: "admin" as const },
  { id: "u2", email: "s234567b@mail.kyutech.ac.jp", role: "member" as const },
  { id: "u3", email: "s345678c@mail.kyutech.ac.jp", role: "member" as const },
];

export default function ManagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const circle = MOCK_CIRCLES.find((c) => c.id === id);
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newEmail.endsWith("@mail.kyutech.ac.jp")) {
      setError("@mail.kyutech.ac.jp のアドレスのみ追加できます");
      return;
    }
    if (members.some((m) => m.email === newEmail)) {
      setError("すでに追加されています");
      return;
    }
    setMembers((prev) => [...prev, { id: `u${Date.now()}`, email: newEmail, role: "member" }]);
    setNewEmail("");
    setAdding(false);
  }

  function handleRemove(userId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0D0D0F" }}>
        <p style={{ color: "rgba(255,255,255,0.3)" }}>サークルが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => router.back()}
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.10)", background: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ pointerEvents: "none" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div>
          <h1 className="text-sm font-semibold silver-text">メンバー管理</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{circle.emoji} {circle.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {/* Member list */}
        <div className="mb-5">
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
            メンバー ({members.length}人)
          </p>
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="glass rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        background: member.role === "admin" ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.05)",
                        border: member.role === "admin" ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{member.role === "admin" ? "★" : "○"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--silver-bright)" }}>
                        {member.email}
                      </p>
                      <p className="text-xs" style={{ color: member.role === "admin" ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.25)" }}>
                        {member.role === "admin" ? "管理者" : "メンバー"}
                      </p>
                    </div>
                  </div>
                  {member.role !== "admin" && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemove(member.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Add member */}
        <AnimatePresence>
          {adding ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleAdd}
              className="glass rounded-2xl p-4 flex flex-col gap-3"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="s000000x@mail.kyutech.ac.jp"
                autoFocus
                className="rounded-xl px-4 py-2.5 text-xs outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--silver-bright)",
                }}
              />
              {error && (
                <p className="text-xs px-1" style={{ color: "rgba(248,113,113,0.8)" }}>{error}</p>
              )}
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 rounded-xl py-2 text-xs"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--silver-bright)",
                    cursor: "pointer",
                  }}
                >
                  追加
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setAdding(false); setError(""); }}
                  className="flex-1 rounded-xl py-2 text-xs"
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.3)",
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </motion.button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setAdding(true)}
              className="w-full glass rounded-xl py-3 text-xs"
              style={{
                border: "1px dashed rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer",
                background: "none",
                letterSpacing: "0.05em",
              }}
            >
              + メンバーを追加
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
