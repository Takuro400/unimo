"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type Step = "input" | "sent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isKyutechEmail = (e: string) => e.endsWith("@mail.kyutech.jp");

  function translateAuthError(raw: string): string {
    const m = raw.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many") || m.includes("429")) {
      return "短時間に送信しすぎました。しばらく待ってから再度お試しください（通常は数十秒〜1時間ほど）。";
    }
    if (m.includes("invalid") && m.includes("email")) {
      return "メールアドレスの形式が正しくありません。";
    }
    if (m.includes("network") || m.includes("fetch")) {
      return "ネットワークエラーです。通信環境をご確認ください。";
    }
    return raw || "送信に失敗しました。もう一度お試しください。";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isKyutechEmail(email)) {
      setError("@mail.kyutech.jp のメールアドレスのみ登録できます");
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: sbError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (sbError) throw sbError;
      }
      setStep("sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-6"
      style={{ background: "#0D0D0F" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold tracking-widest silver-text mb-2">UniMo</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>
          九工大サークル活動の記録
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "input" ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm"
          >
            <div
              className="glass rounded-3xl p-6"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--silver-bright)", letterSpacing: "0.03em" }}
              >
                九工大メールでログイン
              </p>
              <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                @mail.kyutech.jp のアドレスが必要です
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="s000000x@mail.kyutech.jp"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--silver-bright)",
                    letterSpacing: "0.02em",
                  }}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs px-1"
                      style={{ color: "rgba(248,113,113,0.85)" }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading || !email}
                  whileTap={{ scale: 0.96 }}
                  className="w-full rounded-xl py-3 text-sm font-medium"
                  style={{
                    background: loading || !email
                      ? "rgba(255,255,255,0.05)"
                      : "linear-gradient(135deg, rgba(192,192,208,0.18), rgba(140,140,160,0.10))",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: loading || !email ? "rgba(255,255,255,0.25)" : "var(--silver-bright)",
                    cursor: loading || !email ? "not-allowed" : "pointer",
                    letterSpacing: "0.05em",
                    transition: "all 0.3s ease",
                  }}
                >
                  {loading ? "送信中..." : "マジックリンクを送る"}
                </motion.button>
              </form>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              パスワード不要。メールのリンクをタップするだけ。
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm text-center"
          >
            <div
              className="glass rounded-3xl p-8"
              style={{ border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
              >
                <span style={{ fontSize: 26 }}>✉️</span>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--silver-bright)" }}>
                メールを送信しました
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                {email} に届いたリンクをタップしてログインしてください。
              </p>
            </div>
            <button
              onClick={() => { setStep("input"); setEmail(""); }}
              className="mt-4 text-xs"
              style={{ color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}
            >
              メールアドレスを変更する
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
