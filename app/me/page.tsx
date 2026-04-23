"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import type { Circle } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

type ProfileMeta = {
  nickname?: string;
  university?: string;
  faculty?: string;
  department?: string;
};

export default function MePage() {
  const user = useAuth();
  const [meta, setMeta] = useState<ProfileMeta>({});
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<keyof ProfileMeta | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const m = (user.user_metadata as ProfileMeta | undefined) ?? {};
    setMeta(m);

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
      }
      setLoading(false);
    })();
  }, [user]);

  async function saveField(field: keyof ProfileMeta, value: string) {
    setSaving(true);
    const next = { ...meta, [field]: value.trim() };
    setMeta(next);
    if (supabase && user?.id !== "dev-user") {
      await supabase.auth.updateUser({ data: next });
    }
    setSaving(false);
    setEditing(null);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const emailName = user?.email?.split("@")[0] ?? "";
  const displayName = meta.nickname?.trim() || emailName || "ゲスト";

  const universityTags = [
    meta.university || "九州工業大学",
    meta.faculty,
    meta.department,
  ].filter(Boolean) as string[];

  return (
    <div style={{ background: "#0D0D0F", minHeight: "100svh" }}>
      {/* Header */}
      <div
        style={{
          padding: "48px 20px 16px",
          background: "linear-gradient(to bottom, rgba(13,13,15,0.85) 0%, transparent 100%)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-widest silver-text">マイページ</h1>
      </div>

      <div className="px-5 pb-32">
        {/* Profile card */}
        <div
          className="glass rounded-3xl p-6 flex flex-col items-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              background: "linear-gradient(135deg, rgba(167,139,250,0.28), rgba(167,139,250,0.08))",
              border: "1px solid rgba(167,139,250,0.3)",
              fontSize: 30,
              color: "#E9E0FF",
              fontWeight: 600,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          <p
            className="mt-3 text-lg font-semibold silver-text"
            style={{ letterSpacing: "0.03em" }}
          >
            {displayName}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            {user?.email ?? ""}
          </p>

          {/* University / hashtags */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {universityTags.map((t, i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  background: "rgba(167,139,250,0.10)",
                  border: "1px solid rgba(167,139,250,0.22)",
                  color: "rgba(196,181,253,0.9)",
                  letterSpacing: "0.03em",
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Edit fields */}
        <div className="mt-6">
          <h2
            className="text-xs mb-3 px-1"
            style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
          >
            プロフィール
          </h2>
          <div
            className="glass rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <FieldRow
              label="ニックネーム"
              value={meta.nickname}
              placeholder="設定する"
              onEdit={() => {
                setDraft(meta.nickname ?? "");
                setEditing("nickname");
              }}
            />
            <Divider />
            <FieldRow
              label="大学"
              value={meta.university}
              placeholder="九州工業大学"
              onEdit={() => {
                setDraft(meta.university ?? "");
                setEditing("university");
              }}
            />
            <Divider />
            <FieldRow
              label="学部"
              value={meta.faculty}
              placeholder="工学部"
              onEdit={() => {
                setDraft(meta.faculty ?? "");
                setEditing("faculty");
              }}
            />
            <Divider />
            <FieldRow
              label="学科・類"
              value={meta.department}
              placeholder="◯類 / ◯◯工学科"
              onEdit={() => {
                setDraft(meta.department ?? "");
                setEditing("department");
              }}
            />
          </div>
        </div>

        {/* Joined circles */}
        <div className="mt-6">
          <h2
            className="text-xs mb-3 px-1"
            style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
          >
            所属サークル ({myCircles.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : myCircles.length === 0 ? (
            <div
              className="glass rounded-2xl p-4 text-center"
              style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                まだサークルに参加していません
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {myCircles.map((c) => (
                <Link
                  key={c.id}
                  href={`/circle/${c.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className="glass rounded-xl p-3 flex items-center gap-2"
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
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {c.emoji}
                      </div>
                    )}
                    <span
                      className="truncate"
                      style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}
                    >
                      {c.name}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="mt-8 w-full rounded-2xl py-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            letterSpacing: "0.05em",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>

      <BottomNav />

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <EditModal
            field={editing}
            value={draft}
            onChange={setDraft}
            onCancel={() => setEditing(null)}
            onSave={() => saveField(editing, draft)}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />;
}

function FieldRow({
  label,
  value,
  placeholder,
  onEdit,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onEdit: () => void;
}) {
  const empty = !value?.trim();
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onEdit}
      className="w-full flex items-center justify-between px-4 py-3.5"
      style={{ background: "none", border: "none", cursor: "pointer" }}
    >
      <span
        style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: empty ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)",
          fontStyle: empty ? "italic" : "normal",
        }}
      >
        {empty ? placeholder : value}
      </span>
    </motion.button>
  );
}

const FIELD_LABELS: Record<keyof ProfileMeta, string> = {
  nickname: "ニックネーム",
  university: "大学",
  faculty: "学部",
  department: "学科・類",
};

function EditModal({
  field,
  value,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  field: keyof ProfileMeta;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 100,
          backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          background: "#141416",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "24px 24px 0 0",
          padding: "24px 24px 40px",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <p className="text-base font-semibold silver-text mb-4">
          {FIELD_LABELS[field]}
        </p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={FIELD_LABELS[field]}
          className="w-full rounded-xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#E0E0E8",
            fontSize: 15,
            outline: "none",
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <motion.button
            whileTap={saving ? undefined : { scale: 0.97 }}
            onClick={saving ? undefined : onSave}
            disabled={saving}
            className="flex-1 rounded-xl py-3"
            style={{
              background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(167,139,250,0.10))",
              border: "1px solid rgba(167,139,250,0.35)",
              color: "#C4B5FD",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "保存中..." : "保存"}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
