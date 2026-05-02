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
  const ringRadius = radius * 0.78;
  const dotRadius = ringRadius + 14;
  const isDense = count > 20;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={containerRef}
        style={{
          width: size,
          height: size,
          position: "relative",
          touchAction: "none",
          /* ライトテーマの立体感 */
          filter: [
            "drop-shadow(0 8px 24px rgba(0,0,0,0.12))",
            "drop-shadow(0 2px 8px rgba(212,83,126,0.08))",
          ].join(" "),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ── ベースリング ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 38% 32%, #FFFFFF 0%, #F0EEF5 60%, #E8E4F0 100%)",
            boxShadow: [
              "inset 0 2px 6px rgba(255,255,255,0.90)",
              "inset 0 -3px 10px rgba(0,0,0,0.08)",
              "inset 0 0 30px rgba(0,0,0,0.04)",
              "0 0 0 1px rgba(0,0,0,0.06)",
            ].join(", "),
          }}
        />

        {/* ── トラックリング ── */}
        <div
          style={{
            position: "absolute",
            inset: size * 0.09,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 38% 30%, #FAFAFA 0%, #F3F1F8 70%)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            boxShadow: [
              "inset 0 3px 8px rgba(0,0,0,0.06)",
              "inset 0 -1px 4px rgba(212,83,126,0.04)",
              "0 1px 2px rgba(255,255,255,0.9)",
            ].join(", "),
          }}
        />

        {/* ── 上ハイライトアーク ── */}
        <div
          style={{
            position: "absolute",
            inset: size * 0.09,
            borderRadius: "50%",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.65) 0%, transparent 35%)",
            pointerEvents: "none",
          }}
        />

        {/* ── 回転レイヤー（目盛り＋ドット） ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${rotation}deg)`,
            transition: isSnapping ? "transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          }}
        >
          {items.map((_, i) => {
            const angle = i * snapAngle;
            const isSelected = i === selectedIndex;
            const isMajor = isDense ? i % 5 === 0 : i % 3 === 0;
            const hasContent = activeIndices?.has(i) ?? false;

            /* 12時方向が最も明るく、横・下に向かって淡くなる立体感 */
            const effectiveDeg = ((i * snapAngle + rotation) % 360 + 360) % 360;
            const fromTop = effectiveDeg > 180 ? effectiveDeg - 360 : effectiveDeg;
            const perspective = Math.max(0.06, Math.cos((fromTop * Math.PI) / 180));
            const perspectiveOpacity = isSelected ? 1 : Math.min(1, perspective * 1.1);

            const markerLen = isMajor ? (isDense ? 16 : 22) : isSelected ? 16 : isDense ? 7 : 13;
            const markerWidth = isMajor ? 2.5 : isSelected ? 2 : 1.5;

            return (
              <React.Fragment key={i}>
                {/* 目盛り */}
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
                    background: isSelected
                      ? "linear-gradient(to bottom, #E8728E, #D4537E)"
                      : isMajor
                      ? `rgba(100,80,120,${0.55 * perspectiveOpacity})`
                      : `rgba(130,110,150,${0.28 * perspectiveOpacity})`,
                    borderRadius: 2,
                    boxShadow: isSelected
                      ? "0 0 8px rgba(212,83,126,0.8), 0 0 16px rgba(212,83,126,0.3)"
                      : "none",
                    transition: "background 0.25s ease, box-shadow 0.25s ease",
                  }}
                />
                {/* アクティブドット */}
                {hasContent && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 5,
                      height: 5,
                      marginLeft: -2.5,
                      marginTop: -2.5,
                      borderRadius: "50%",
                      transform: `rotate(${angle}deg) translateY(-${dotRadius}px)`,
                      background: isSelected ? "#D4537E" : `rgba(212,83,126,${0.45 * perspectiveOpacity})`,
                      boxShadow: isSelected ? "0 0 6px rgba(212,83,126,0.9)" : "none",
                      transition: "background 0.25s ease",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── 選択ポインター（12時固定） ── */}
        <div
          style={{
            position: "absolute",
            top: size * 0.09 + 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 3,
            height: 18,
            borderRadius: 2,
            background: "linear-gradient(to bottom, rgba(212,83,126,0.95), rgba(212,83,126,0.4))",
            boxShadow: "0 0 10px rgba(212,83,126,0.7)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* ── センター ── */}
        <div
          style={{
            position: "absolute",
            inset: "22%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 38% 30%, #FFFFFF 0%, #F8F5FC 80%)",
            border: "0.5px solid rgba(0,0,0,0.07)",
            boxShadow: [
              "inset 0 4px 12px rgba(0,0,0,0.06)",
              "inset 0 -1px 4px rgba(212,83,126,0.06)",
              "0 2px 4px rgba(255,255,255,0.9)",
            ].join(", "),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* センターハイライト */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, transparent 40%)",
            pointerEvents: "none",
          }} />
          {centerOverride ?? (
            <>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#1F2937",
                  letterSpacing: "0.03em",
                }}
              >
                {items[selectedIndex]}
              </span>
              <div
                style={{
                  width: 20,
                  height: 1.5,
                  marginTop: 6,
                  background: "linear-gradient(to right, transparent, rgba(212,83,126,0.5), transparent)",
                  borderRadius: 1,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
