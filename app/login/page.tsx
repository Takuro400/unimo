"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAllowedEmail, ALLOWED_DOMAINS_LABEL } from "@/lib/email-domains";

type Step = "input" | "code";

const LAST_EMAIL_KEY = "unimo:last_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(LAST_EMAIL_KEY);
      if (remembered) setEmail(remembered);
    } catch {
      // localStorage unavailable; ignore
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) router.replace("/");
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) router.replace("/");
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [router]);

  function translateAuthError(raw: string): string {
    const m = raw.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many") || m.includes("429")) {
      return "短時間に送信しすぎました。しばらく待ってから再度お試しください（通常は数十秒〜1時間ほど）。";
    }
    if (m.includes("expired") || m.includes("invalid") && m.includes("token")) {
      return "コードが違うか、有効期限が切れています。再送してください。";
    }
    if (m.includes("invalid") && m.includes("email")) {
      return "メールアドレスの形式が正しくありません。";
    }
    if (m.includes("network") || m.includes("fetch")) {
      return "ネットワークエラーです。通信環境をご確認ください。";
    }
    return raw || "送信に失敗しました。もう一度お試しください。";
  }

  async function sendCode(targetEmail: string): Promise<void> {
    if (!(isSupabaseConfigured && supabase)) return;
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });
    if (sbError) throw sbError;
  }

  async function handleSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!isAllowedEmail(trimmed)) {
      setError(`${ALLOWED_DOMAINS_LABEL} のメールアドレスのみ登録できます`);
      return;
    }

    setLoading(true);
    try {
      await sendCode(trimmed);
      setEmail(trimmed);
      setCode("");
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("コードを入力してください");
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: vErr } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        if (vErr) throw vErr;
      }
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email);
      } catch {
        // ignore
      }
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    setError("");
    try {
      await sendCode(email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(msg));
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-6"
      style={{ background: "#FAFAFA" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center mb-12"
      >
        <h1
          className="text-4xl font-bold tracking-widest mb-2"
          style={{ color: "#1F2937" }}
        >
          UniMo
        </h1>
        <p style={{ fontSize: 12, color: "#9CA3AF", letterSpacing: "0.1em" }}>
          サークル活動の記録
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
              className="rounded-3xl p-6"
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E5E5E5",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#1F2937", letterSpacing: "0.03em" }}
              >
                大学メールでログイン
              </p>
              <p className="text-xs mb-5" style={{ color: "#9CA3AF" }}>
                @mail.kyutech.jp / @seinan-jo.ac.jp のアドレスが必要です
              </p>

              <form onSubmit={handleSubmitEmail} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="s000000x@mail.kyutech.jp"
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    color: "#1F2937",
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
                      style={{ color: "#EF4444" }}
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
                    background:
                      loading || !email
                        ? "rgba(0,0,0,0.04)"
                        : "#D4537E",
                    border: loading || !email
                      ? "0.5px solid rgba(0,0,0,0.08)"
                      : "none",
                    color: loading || !email ? "#9CA3AF" : "#FFFFFF",
                    cursor: loading || !email ? "not-allowed" : "pointer",
                    letterSpacing: "0.05em",
                    transition: "all 0.3s ease",
                    boxShadow:
                      loading || !email
                        ? "none"
                        : "0 4px 14px rgba(212,83,126,0.35)",
                  }}
                >
                  {loading ? "送信中..." : "認証コードを送る"}
                </motion.button>
              </form>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: "#9CA3AF" }}>
              メールに届いた認証コードを次の画面で入力します（6〜8桁）
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-6"
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E5E5E5",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: "#FFF0F6",
                  border: "1px solid rgba(212,83,126,0.2)",
                }}
              >
                <span style={{ fontSize: 22 }}>🔑</span>
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "#1F2937", letterSpacing: "0.03em" }}
              >
                認証コードを入力
              </p>
              <p className="text-xs mb-5 leading-relaxed" style={{ color: "#6C757D" }}>
                {email} 宛に認証コードを送りました。メールに届いた数字をそのまま入力してください。
              </p>

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
                <input
                  ref={codeInputRef}
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="認証コードを入力"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6,10}"
                  maxLength={10}
                  className="w-full rounded-xl py-3 text-center outline-none"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: "0.5px solid rgba(212,83,126,0.3)",
                    color: "#D4537E",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "0.35em",
                    paddingLeft: "0.35em",
                  }}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs px-1"
                      style={{ color: "#EF4444" }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading || code.length < 6}
                  whileTap={{ scale: 0.96 }}
                  className="w-full rounded-xl py-3 text-sm font-medium"
                  style={{
                    background:
                      loading || code.length < 6
                        ? "rgba(0,0,0,0.04)"
                        : "#D4537E",
                    border:
                      loading || code.length < 6
                        ? "0.5px solid rgba(0,0,0,0.08)"
                        : "none",
                    color: loading || code.length < 6 ? "#9CA3AF" : "#FFFFFF",
                    cursor: loading || code.length < 6 ? "not-allowed" : "pointer",
                    letterSpacing: "0.05em",
                    transition: "all 0.3s ease",
                    boxShadow:
                      loading || code.length < 6
                        ? "none"
                        : "0 4px 14px rgba(212,83,126,0.35)",
                  }}
                >
                  {loading ? "確認中..." : "ログイン"}
                </motion.button>
              </form>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <button
                onClick={() => {
                  setStep("input");
                  setCode("");
                  setError("");
                }}
                style={{
                  color: "#9CA3AF",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                メールを変更
              </button>
              <span style={{ color: "#E5E5E5" }}>•</span>
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  color: resending ? "#9CA3AF" : "#D4537E",
                  background: "none",
                  border: "none",
                  cursor: resending ? "not-allowed" : "pointer",
                }}
              >
                {resending ? "送信中..." : "コードを再送"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
