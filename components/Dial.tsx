"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface DialProps {
  items: string[];
  initialIndex?: number;
  onChange?: (index: number) => void;
  onCommit?: (index: number) => void;
  size?: number;
  activeIndices?: Set<number>;
  centerOverride?: React.ReactNode;
}

export default function Dial({
  items,
  initialIndex = 0,
  onChange,
  onCommit,
  size = 320,
  activeIndices,
  centerOverride,
}: DialProps) {
  const count = items.length;
  const snapAngle = 360 / count;

  const [rotation, setRotation] = useState(-initialIndex * snapAngle);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isSnapping, setIsSnapping] = useState(false);

  const stateRef = useRef({
    isDragging: false,
    lastAngle: 0,
    velocity: 0,
    lastTime: 0,
    rotation: -initialIndex * snapAngle,
    rafId: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef(initialIndex);

  const emit = useCallback(
    (idx: number) => {
      if (lastEmittedRef.current !== idx) {
        lastEmittedRef.current = idx;
        onChange?.(idx);
      }
    },
    [onChange]
  );

  const getAngleFromCenter = useCallback((clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const snapToIndex = useCallback(
    (currentRotation: number): number => {
      const normalized = ((currentRotation % 360) + 360) % 360;
      const k = Math.round(normalized / snapAngle);
      return ((-k % count) + count) % count;
    },
    [count, snapAngle]
  );

  const runInertia = useCallback(() => {
    const s = stateRef.current;
    s.velocity *= 0.94;
    s.rotation += s.velocity;

    if (Math.abs(s.velocity) < 0.1) {
      const normalized = ((s.rotation % 360) + 360) % 360;
      const snappedNorm = Math.round(normalized / snapAngle) * snapAngle;
      const diff = snappedNorm - normalized;
      const target = s.rotation + diff;

      setIsSnapping(true);
      setRotation(target);
      stateRef.current.rotation = target;

      const idx = snapToIndex(target);
      setSelectedIndex(idx);
      emit(idx);
      onCommit?.(idx);

      setTimeout(() => setIsSnapping(false), 420);
      return;
    }

    setRotation(s.rotation);
    const idx = snapToIndex(s.rotation);
    setSelectedIndex(idx);
    emit(idx);
    s.rafId = requestAnimationFrame(runInertia);
  }, [snapToIndex, emit, onCommit, snapAngle]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      cancelAnimationFrame(s.rafId);
      s.isDragging = true;
      s.lastAngle = getAngleFromCenter(e.clientX, e.clientY);
      s.velocity = 0;
      s.lastTime = performance.now();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getAngleFromCenter]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (!s.isDragging) return;

      const angle = getAngleFromCenter(e.clientX, e.clientY);
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
      const idx = snapToIndex(s.rotation);
      setSelectedIndex(idx);
      emit(idx);
    },
    [getAngleFromCenter, snapToIndex, emit]
  );

  const handlePointerUp = useCallback(() => {
    const s = stateRef.current;
    if (!s.isDragging) return;
    s.isDragging = false;
    s.rafId = requestAnimationFrame(runInertia);
  }, [runInertia]);

  useEffect(() => {
    return () => cancelAnimationFrame(stateRef.current.rafId);
  }, []);

  const radius = size / 2;
  // 目盛りの配置半径：ダイヤル面の外寄り
  const ringRadius = radius * 0.72;
  const dotRadius = ringRadius + 18;
  const isDense = count > 20;

  // クロームリムの厚さ
  const rimInset = size * 0.072;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={containerRef}
        style={{
          width: size,
          height: size,
          position: "relative",
          touchAction: "none",
          // 全体の重厚な落ち影
          filter: [
            "drop-shadow(0 16px 40px rgba(0,0,0,0.45))",
            "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
            "drop-shadow(0 1px 3px rgba(0,0,0,0.3))",
          ].join(" "),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── クロームベゼル外縁 ── */}
        {/* 金属外枠の最背面：暗めのリング */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "conic-gradient(from 120deg, #A8A8B8 0%, #E8E8F5 12%, #F4F4FF 18%, #D8D8E8 28%, #909098 42%, #686870 52%, #909098 62%, #D0D0E0 72%, #F0F0FC 80%, #E4E4F0 88%, #A8A8B8 100%)",
            boxShadow: [
              // 底面のきつい影
              "0 10px 30px rgba(0,0,0,0.55)",
              "0 4px 10px rgba(0,0,0,0.35)",
              // 外縁の細いハイライト
              "0 0 0 1px rgba(255,255,255,0.30)",
              // 外縁の暗いアウトライン
              "0 0 0 1.5px rgba(0,0,0,0.40)",
              // 内側の凹み表現
              "inset 0 3px 5px rgba(255,255,255,0.55)",
              "inset 0 -4px 8px rgba(0,0,0,0.45)",
            ].join(", "),
          }}
        />

        {/* ── クロームベゼル 内側ハイライトリング ── */}
        {/* リムの光沢・玉虫感を補強するオーバーレイ */}
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 38% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 35%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* ── ダイヤル本体（暗い金属面）── */}
        {/* 実際に回転する握り部分のベースになる暗い円盤 */}
        <div
          style={{
            position: "absolute",
            inset: rimInset,
            borderRadius: "50%",
            // 中央やや上が少し明るく、縁に向かって暗くなる凹み感
            background:
              "radial-gradient(ellipse at 42% 34%, #58586A 0%, #3C3C4C 38%, #2C2C3C 65%, #222230 100%)",
            boxShadow: [
              // 内側に落ち込む深い影
              "inset 0 8px 24px rgba(0,0,0,0.70)",
              "inset 0 -4px 12px rgba(0,0,0,0.45)",
              "inset 0 0 50px rgba(0,0,0,0.35)",
              // リムとの境界ハイライト
              "0 0 0 1px rgba(255,255,255,0.12)",
            ].join(", "),
          }}
        />

        {/* ── ダイヤル面：上部の淡い光 ── */}
        <div
          style={{
            position: "absolute",
            inset: rimInset,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 42% 18%, rgba(255,255,255,0.10) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />

        {/* ── 回転レイヤー（目盛り＋ドット） ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${rotation}deg)`,
            transition: isSnapping
              ? "transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              : "none",
          }}
        >
          {items.map((_, i) => {
            const angle = i * snapAngle;
            const isSelected = i === selectedIndex;
            const isMajor = isDense ? i % 5 === 0 : i % 3 === 0;
            const hasContent = activeIndices?.has(i) ?? false;

            // 12時方向ほど明るく、下・横へ行くほど暗くなる透視感
            const effectiveDeg = ((i * snapAngle + rotation) % 360 + 360) % 360;
            const fromTop = effectiveDeg > 180 ? effectiveDeg - 360 : effectiveDeg;
            const perspective = Math.max(0.06, Math.cos((fromTop * Math.PI) / 180));
            const perspOpacity = isSelected ? 1 : Math.min(1, perspective * 1.2);

            // 長さ・太さ
            const markerLen = isSelected
              ? isDense ? 18 : 24
              : isMajor
              ? isDense ? 14 : 20
              : isDense ? 6 : 12;
            const markerWidth = isSelected ? 3 : isMajor ? 2.5 : 1.5;

            return (
              <React.Fragment key={i}>
                {/* 目盛り：エンボス風（白シルバー＋底影） */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: markerWidth,
                    height: markerLen,
                    marginLeft: -markerWidth / 2,
                    marginTop: -markerLen / 2,
                    transform: `rotate(${angle}deg) translateY(-${ringRadius - markerLen / 2}px)`,
                    borderRadius: 2,
                    background: isSelected
                      ? "linear-gradient(to bottom, #FF9DBB, #D4537E)"
                      : isMajor
                      ? `rgba(230,228,240,${0.88 * perspOpacity})`
                      : `rgba(180,175,200,${0.42 * perspOpacity})`,
                    boxShadow: isSelected
                      ? [
                          "0 0 12px rgba(212,83,126,1.0)",
                          "0 0 24px rgba(212,83,126,0.5)",
                          "0 2px 3px rgba(0,0,0,0.6)",
                          "0 -0.5px 1px rgba(255,255,255,0.2)",
                        ].join(", ")
                      : isMajor
                      ? [
                          `0 1.5px 3px rgba(0,0,0,${0.7 * perspOpacity})`,
                          `0 -0.5px 1px rgba(255,255,255,${0.22 * perspOpacity})`,
                        ].join(", ")
                      : `0 1px 2px rgba(0,0,0,${0.5 * perspOpacity})`,
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                  }}
                />
                {/* アクティブドット（投稿あり月） */}
                {hasContent && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 6,
                      height: 6,
                      marginLeft: -3,
                      marginTop: -3,
                      borderRadius: "50%",
                      transform: `rotate(${angle}deg) translateY(-${dotRadius}px)`,
                      background: isSelected
                        ? "#FF9DBB"
                        : `rgba(212,83,126,${0.65 * perspOpacity})`,
                      boxShadow: isSelected
                        ? "0 0 10px rgba(212,83,126,1.0), 0 0 4px rgba(212,83,126,0.6)"
                        : `0 1px 3px rgba(0,0,0,${0.6 * perspOpacity})`,
                      transition: "background 0.2s ease",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── 選択ポインター（三角ノッチ、12時固定）── */}
        {/* 外側三角 */}
        <div
          style={{
            position: "absolute",
            top: rimInset - 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "16px solid #D4537E",
            filter: "drop-shadow(0 0 6px rgba(212,83,126,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
        {/* ポインターハイライト（三角内の光） */}
        <div
          style={{
            position: "absolute",
            top: rimInset - 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "8px solid rgba(255,180,200,0.6)",
            pointerEvents: "none",
            zIndex: 11,
          }}
        />

        {/* ── センターハブ（ポリッシュメタル）── */}
        <div
          style={{
            position: "absolute",
            inset: "22%",
            borderRadius: "50%",
            // 光沢シルバー：左上に明るいハイライト
            background:
              "radial-gradient(ellipse at 38% 30%, #DCDCE8 0%, #B4B4C4 40%, #909098 72%, #7C7C8A 100%)",
            boxShadow: [
              // 凸感を出す影
              "0 6px 16px rgba(0,0,0,0.55)",
              "0 2px 6px rgba(0,0,0,0.35)",
              "0 0 0 1.5px rgba(0,0,0,0.40)",
              "0 0 0 3px rgba(255,255,255,0.10)",
              // 内側の深み
              "inset 0 4px 10px rgba(0,0,0,0.40)",
              "inset 0 -2px 6px rgba(255,255,255,0.20)",
            ].join(", "),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* ハブ：左上ハイライトグロー */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at 36% 26%, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.12) 38%, transparent 62%)",
              pointerEvents: "none",
            }}
          />
          {/* ハブ：縁の光沢リング */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 30%, rgba(0,0,0,0.20) 100%)",
              pointerEvents: "none",
            }}
          />
          {centerOverride ?? (
            <>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#F2F2FA",
                  letterSpacing: "0.04em",
                  // テキストエンボス
                  textShadow: [
                    "0 2px 4px rgba(0,0,0,0.65)",
                    "0 -1px 1px rgba(255,255,255,0.18)",
                  ].join(", "),
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {items[selectedIndex]}
              </span>
              <div
                style={{
                  width: 22,
                  height: 1.5,
                  marginTop: 6,
                  background:
                    "linear-gradient(to right, transparent, rgba(212,83,126,0.75), transparent)",
                  borderRadius: 1,
                  position: "relative",
                  zIndex: 1,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
