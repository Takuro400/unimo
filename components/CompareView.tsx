"use client";

import { motion } from "framer-motion";
import type { Circle } from "@/lib/types";

interface CompareViewProps {
  circles: Circle[];
  onClose: () => void;
  onNavigate: (circleId: string) => void;
}

type CompareField = {
  label: string;
  icon: string;
  key: keyof Circle | "__name__";
  fmt?: (val: unknown) => string;
};

const FIELDS: CompareField[] = [
  { label: "カテゴリ",  icon: "🏷️", key: "category" },
  { label: "活動日",   icon: "📅", key: "activity_days" },
  { label: "部員数",   icon: "👥", key: "member_count", fmt: (v) => (v != null ? `${v}人` : "—") },
  { label: "部費",     icon: "💰", key: "fee" },
  { label: "活動場所", icon: "📍", key: "location" },
];

function getValue(circle: Circle, field: CompareField): string {
  const raw = circle[field.key as keyof Circle];
  if (raw == null || raw === "") return "—";
  if (field.fmt) return field.fmt(raw);
  return String(raw);
}

function allSame(circles: Circle[], field: CompareField): boolean {
  if (circles.length < 2) return true;
  const vals = circles.map((c) => getValue(c, field));
  return vals.every((v) => v === vals[0]);
}

export default function CompareView({ circles, onClose, onNavigate }: CompareViewProps) {
  if (circles.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#FAFAFA",
        overflowY: "auto",
        paddingBottom: 40,
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#FFFFFF",
          borderBottom: "0.5px solid #E5E5E5",
          padding: "52px 20px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "0.5px solid #E5E5E5",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6C757D" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>比較する</p>
          <p style={{ fontSize: 11, color: "#9CA3AF" }}>{circles.length}団体を比較中</p>
        </div>
      </div>

      <div style={{ padding: "16px 12px 0" }}>
        {/* サークル名ヘッダー行 */}
        <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${circles.length}, 1fr)`, gap: 8, marginBottom: 12 }}>
          <div />
          {circles.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate(c.id)}
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E5E5E5",
                borderRadius: 12,
                padding: "10px 8px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              {c.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1EFE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {c.emoji}
                </div>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, color: "#1F2937", textAlign: "center", lineHeight: 1.3 }}>
                {c.name}
              </p>
            </button>
          ))}
        </div>

        {/* 比較行 */}
        {FIELDS.map((field) => {
          const same = allSame(circles, field);
          return (
            <div
              key={field.key}
              style={{
                display: "grid",
                gridTemplateColumns: `80px repeat(${circles.length}, 1fr)`,
                gap: 8,
                marginBottom: 8,
              }}
            >
              {/* ラベル */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  background: "#F1EFE8",
                  borderRadius: 10,
                  padding: "8px 4px",
                }}
              >
                <span style={{ fontSize: 14 }}>{field.icon}</span>
                <span style={{ fontSize: 10, color: "#6C757D", textAlign: "center" }}>{field.label}</span>
              </div>

              {/* 各サークルの値 */}
              {circles.map((c) => {
                const val = getValue(c, field);
                const isDiff = !same && val !== "—";
                return (
                  <div
                    key={c.id}
                    style={{
                      background: isDiff ? "#FFF0F6" : "#FFFFFF",
                      border: isDiff ? "0.5px solid rgba(212,83,126,0.3)" : "0.5px solid #E5E5E5",
                      borderRadius: 10,
                      padding: "8px 6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 48,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: isDiff ? "#D4537E" : val === "—" ? "#D1D5DB" : "#1F2937",
                        fontWeight: isDiff ? 700 : 400,
                        textAlign: "center",
                        lineHeight: 1.4,
                      }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 説明文の比較 */}
        {circles.some((c) => c.description) && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, paddingLeft: 4 }}>活動紹介</p>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${circles.length}, 1fr)`, gap: 8 }}>
              {circles.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "#FFFFFF",
                    border: "0.5px solid #E5E5E5",
                    borderRadius: 10,
                    padding: "10px",
                  }}
                >
                  <p style={{ fontSize: 11, color: "#6C757D", lineHeight: 1.6 }}>
                    {c.description ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 詳細ページへ */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${circles.length}, 1fr)`, gap: 8, marginTop: 16 }}>
          {circles.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate(c.id)}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                border: "none",
                background: "#D4537E",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              詳細を見る
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
