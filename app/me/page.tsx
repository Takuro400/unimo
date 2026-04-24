"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import type { Circle, Post } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

type ProfileMeta = {
  nickname?: string;
  university?: string;
  faculty?: string;
  department?: string;
  avatar_url?: string;
  favorites?: string[];
};

const MAX_FAVS = 6;

export default function MePage() {
  const user = useAuth();
  const [meta, setMeta] = useState<ProfileMeta>({});
  const [favPosts, setFavPosts] = useState<Record<string, Post>>({});
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState<keyof ProfileMeta | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const m = (user.user_metadata as ProfileMeta | undefined) ?? {};
    setMeta(m);

    (async () => {
      if (supabase && user.id !== "dev-user") {
        const [{ data: memberData }, favData] = await Promise.all([
          supabase
            .from("circle_members")
            .select("circle:circles(*)")
            .eq("user_id", user.id),
          m.favorites && m.favorites.length
            ? supabase.from("posts").select("*").in("id", m.favorites)
            : Promise.resolve({ data: [] as Post[] }),
        ]);
        if (memberData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMyCircles(memberData.map((r: any) => r.circle).filter(Boolean));
        }
        const map: Record<string, Post> = {};
        for (const p of (favData.data ?? []) as Post[]) map[p.id] = p;
        setFavPosts(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const saveMeta = useCallback(
    async (next: ProfileMeta) => {
      setMeta(next);
      if (supabase && user && user.id !== "dev-user") {
        await supabase.auth.updateUser({ data: next });
        // Also mirror readable fields to the public profiles table so other users can see them.
        // Graceful: if the table doesn't exist yet, the error is swallowed.
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              nickname: next.nickname ?? null,
              avatar_url: next.avatar_url ?? null,
              university: next.university ?? null,
              faculty: next.faculty ?? null,
              department: next.department ?? null,
            },
            { onConflict: "user_id" }
          );
        } catch {
          // profiles table missing or RLS blocked — ignore
        }
      }
    },
    [user]
  );

  async function saveField(field: keyof ProfileMeta, value: string) {
    setSaving(true);
    try {
      await saveMeta({ ...meta, [field]: value.trim() });
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  async function handleAvatarFile(file: File) {
    if (!supabase || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("posts")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      await saveMeta({ ...meta, avatar_url: data.publicUrl });
    } catch (err) {
      console.error("avatar upload failed", err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeFavorite(postId: string) {
    const next = (meta.favorites ?? []).filter((id) => id !== postId);
    await saveMeta({ ...meta, favorites: next });
    setFavPosts((prev) => {
      const cp = { ...prev };
      delete cp[postId];
      return cp;
    });
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

  const favoriteIds = meta.favorites ?? [];
  const orbit: (Post | null)[] = Array.from({ length: MAX_FAVS }, (_, i) => {
    const id = favoriteIds[i];
    return id ? favPosts[id] ?? null : null;
  });

  return (
    <div style={{ background: "#0D0D0F", minHeight: "100svh" }}>
      {/* Header */}
      <div
        style={{
          padding: "48px 20px 8px",
          background: "linear-gradient(to bottom, rgba(13,13,15,0.85) 0%, transparent 100%)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-widest silver-text">マイページ</h1>
      </div>

      <div className="flex flex-col items-center px-5 pb-32">
        {/* Centerpiece: rotating orbit of favorites + central avatar */}
        <FavoritesOrbit
          avatarUrl={meta.avatar_url}
          initial={displayName.charAt(0).toUpperCase()}
          posts={orbit}
          uploading={uploadingAvatar}
          onAvatarTap={() => fileInputRef.current?.click()}
          onRemoveFav={removeFavorite}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleAvatarFile(f);
            e.target.value = "";
          }}
        />

        <p
          className="mt-4 text-lg font-semibold silver-text"
          style={{ letterSpacing: "0.03em" }}
        >
          {displayName}
        </p>
        <p
          className="mt-0.5 text-xs"
          style={{ color: "rgba(255,255,255,0.32)" }}
        >
          {user?.email ?? ""}
        </p>

        {/* Hashtag tags */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {universityTags.map((t, i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                fontSize: 11,
                padding: "3px 10px",
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

        {/* Favorites hint */}
        {favoriteIds.length === 0 && (
          <p
            className="mt-4 text-xs text-center"
            style={{ color: "rgba(255,255,255,0.35)", maxWidth: 280, lineHeight: 1.6 }}
          >
            所属サークルの投稿をハートしてお気に入り6つまで登録すると<br />アイコンの周りに表示されます
          </p>
        )}

        {/* Edit fields */}
        <div className="w-full mt-8 max-w-md">
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
        <div className="w-full mt-6 max-w-md">
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
          className="mt-8 w-full max-w-md rounded-2xl py-3"
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

function FavoritesOrbit({
  avatarUrl,
  initial,
  posts,
  uploading,
  onAvatarTap,
  onRemoveFav,
}: {
  avatarUrl?: string;
  initial: string;
  posts: (Post | null)[];
  uploading: boolean;
  onAvatarTap: () => void;
  onRemoveFav: (postId: string) => void;
}) {
  const size = 360;
  const centerAvatarSize = 128;
  const slotSize = 78;
  const radius = size / 2 - slotSize / 2 - 8;

  const [rotation, setRotation] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const stateRef = useRef({
    isDragging: false,
    lastAngle: 0,
    velocity: 0,
    lastTime: 0,
    rotation: 0,
    rafId: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const getAngle = useCallback((cx: number, cy: number, x: number, y: number) => {
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  }, []);

  const runInertia = useCallback(() => {
    const s = stateRef.current;
    s.velocity *= 0.95;
    s.rotation += s.velocity;

    if (Math.abs(s.velocity) < 0.1) {
      const snap = 60;
      const snapped = Math.round(s.rotation / snap) * snap;
      s.rotation = snapped;
      setIsSnapping(true);
      setRotation(snapped);
      setTimeout(() => setIsSnapping(false), 300);
      return;
    }
    setRotation(s.rotation);
    s.rafId = requestAnimationFrame(runInertia);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    const s = stateRef.current;
    cancelAnimationFrame(s.rafId);
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    s.isDragging = true;
    s.lastAngle = getAngle(cx, cy, e.clientX, e.clientY);
    s.velocity = 0;
    s.lastTime = performance.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = stateRef.current;
    if (!s.isDragging) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = getAngle(cx, cy, e.clientX, e.clientY);
    let delta = angle - s.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const now = performance.now();
    const dt = now - s.lastTime;
    if (dt > 0) s.velocity = delta * (16 / dt);
    s.rotation += delta;
    s.lastAngle = angle;
    s.lastTime = now;
    setRotation(s.rotation);
  }
  function onPointerUp() {
    const s = stateRef.current;
    if (!s.isDragging) return;
    s.isDragging = false;
    s.rafId = requestAnimationFrame(runInertia);
  }

  useEffect(() => () => cancelAnimationFrame(stateRef.current.rafId), []);

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: size, height: size, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Orbit line */}
      <div
        style={{
          position: "absolute",
          left: size / 2 - radius - slotSize / 2,
          top: size / 2 - radius - slotSize / 2,
          width: (radius + slotSize / 2) * 2,
          height: (radius + slotSize / 2) * 2,
          borderRadius: "50%",
          border: "1px dashed rgba(167,139,250,0.12)",
          pointerEvents: "none",
        }}
      />

      {/* Rotating layer with the 6 slots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${rotation}deg)`,
          transition: isSnapping ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
        }}
      >
        {posts.map((post, i) => {
          const angleDeg = i * 60 - 90; // start from top
          const rad = (angleDeg * Math.PI) / 180;
          const x = size / 2 + Math.cos(rad) * radius - slotSize / 2;
          const y = size / 2 + Math.sin(rad) * radius - slotSize / 2;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: slotSize,
                height: slotSize,
              }}
            >
              {/* Inverse rotate so the thumbnail stays upright */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `rotate(${-rotation}deg)`,
                  transition: isSnapping ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
                }}
              >
                <FavoriteSlot post={post} onRemove={post ? () => onRemoveFav(post.id) : undefined} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Central avatar — wrapper handles positioning so framer-motion's whileTap transform doesn't override it */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -centerAvatarSize / 2,
          marginTop: -centerAvatarSize / 2,
          width: centerAvatarSize,
          height: centerAvatarSize,
          zIndex: 2,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAvatarTap}
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            borderRadius: "50%",
            background: avatarUrl
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(167,139,250,0.32), rgba(167,139,250,0.12))",
            border: "2px solid rgba(167,139,250,0.35)",
            cursor: "pointer",
            overflow: "hidden",
            padding: 0,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4), 0 0 24px rgba(167,139,250,0.18)",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 52,
                color: "#E9E0FF",
                fontWeight: 600,
                letterSpacing: "0.05em",
                lineHeight: 1,
              }}
            >
              {initial}
            </span>
          )}
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "rgba(255,255,255,0.85)",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </motion.button>
        {/* Edit badge — positioned on the wrapper so it stays put during the button's tap-scale animation */}
        <span
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#A78BFA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #0D0D0F",
            fontSize: 13,
            color: "#0D0D0F",
            pointerEvents: "none",
            lineHeight: 1,
          }}
        >
          ✎
        </span>
      </div>
    </div>
  );
}

function FavoriteSlot({
  post,
  onRemove,
}: {
  post: Post | null;
  onRemove?: () => void;
}) {
  const [showRemove, setShowRemove] = useState(false);
  if (!post) {
    return (
      <div
        className="rounded-full"
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>♡</span>
      </div>
    );
  }
  return (
    <div
      className="rounded-full"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        border: "1.5px solid rgba(167,139,250,0.28)",
        background: "rgba(255,255,255,0.04)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setShowRemove((v) => !v);
      }}
    >
      {post.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, rgba(167,139,250,0.16), rgba(167,139,250,0.05))",
          }}
        >
          <span style={{ fontSize: 16, opacity: 0.4 }}>🖼️</span>
        </div>
      )}
      <AnimatePresence>
        {showRemove && onRemove && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              setShowRemove(false);
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              backdropFilter: "blur(4px)",
            }}
          >
            ✕
          </motion.button>
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
  avatar_url: "アイコン",
  favorites: "お気に入り",
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
