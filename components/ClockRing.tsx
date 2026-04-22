"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const SNAP_ANGLE = 30;

interface ClockRingProps {
  initialMonth?: number;
  onChange?: (month: number) => void;
  size?: number;
  /** 0-based month indices that have content — shown as a subtle dot */
  activeMonths?: Set<number>;
}

export default function ClockRing({
  initialMonth = 3,
  onChange,
  size = 280,
  activeMonths,
}: ClockRingProps) {
  const [rotation, setRotation] = useState(-initialMonth * SNAP_ANGLE);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [isSnapping, setIsSnapping] = useState(false);

  const stateRef = useRef({
    isDragging: false,
    lastAngle: 0,
    velocity: 0,
    lastTime: 0,
    rotation: -initialMonth * SNAP_ANGLE,
    rafId: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const getAngleFromCenter = useCallback((clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const snapToMonth = useCallback((currentRotation: number): number => {
    const normalized = ((currentRotation % 360) + 360) % 360;
    const snapped = Math.round(normalized / SNAP_ANGLE) * SNAP_ANGLE;
    const monthIndex = (((-snapped / SNAP_ANGLE) % 12) + 12) % 12;
    return monthIndex;
  }, []);

  const runInertia = useCallback(() => {
    const s = stateRef.current;
    s.velocity *= 0.95;
    s.rotation += s.velocity;
    stateRef.current = s;

    if (Math.abs(s.velocity) < 0.1) {
      const normalized = ((s.rotation % 360) + 360) % 360;
      const snappedNorm = Math.round(normalized / SNAP_ANGLE) * SNAP_ANGLE;
      const diff = snappedNorm - normalized;
      const target = s.rotation + diff;

      setIsSnapping(true);
      setRotation(target);
      stateRef.current.rotation = target;

      const monthIdx = snapToMonth(target);
      setSelectedMonth(monthIdx);
      onChange?.(monthIdx);

      setTimeout(() => setIsSnapping(false), 400);
      return;
    }

    setRotation(s.rotation);
    const monthIdx = snapToMonth(s.rotation);
    setSelectedMonth(monthIdx);
    s.rafId = requestAnimationFrame(runInertia);
  }, [snapToMonth, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    cancelAnimationFrame(s.rafId);
    s.isDragging = true;
    s.lastAngle = getAngleFromCenter(e.clientX, e.clientY);
    s.velocity = 0;
    s.lastTime = performance.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [getAngleFromCenter]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
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
    const monthIdx = snapToMonth(s.rotation);
    setSelectedMonth(monthIdx);
  }, [getAngleFromCenter, snapToMonth]);

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

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={containerRef}
        style={{ width: size, height: size, position: "relative", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Outer glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: "0 0 40px rgba(167,139,250,0.07), inset 0 0 40px rgba(167,139,250,0.03)",
          }}
        />

        {/* Ring track */}
        <div
          style={{
            position: "absolute",
            inset: size * 0.1,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(10px)",
          }}
        />

        {/* Rotating layer — markers + active dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${rotation}deg)`,
            transition: isSnapping ? "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            const isSelected = i === selectedMonth;
            const isMajor = i % 3 === 0;
            const hasContent = activeMonths?.has(i) ?? false;
            const markerLen = isMajor ? 18 : isSelected ? 14 : 10;
            const markerWidth = isMajor ? 2 : 1;

            return (
              <React.Fragment key={i}>
                {/* Tick mark */}
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
                      ? "#A78BFA"
                      : isMajor
                      ? "rgba(192,192,200,0.65)"
                      : "rgba(192,192,200,0.3)",
                    borderRadius: 1,
                    boxShadow: isSelected ? "0 0 8px rgba(167,139,250,0.85)" : "none",
                    transition: "background 0.3s ease, box-shadow 0.3s ease",
                  }}
                />
                {/* Active content dot (outside the ring) */}
                {hasContent && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 4,
                      height: 4,
                      marginLeft: -2,
                      marginTop: -2,
                      borderRadius: "50%",
                      transform: `rotate(${angle}deg) translateY(-${dotRadius}px)`,
                      background: isSelected ? "#A78BFA" : "rgba(167,139,250,0.45)",
                      boxShadow: isSelected ? "0 0 5px rgba(167,139,250,0.8)" : "none",
                      transition: "background 0.3s ease, box-shadow 0.3s ease",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Center display */}
        <div
          style={{
            position: "absolute",
            inset: "25%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(167,139,250,0.10)",
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #C0C0C8 0%, #E8E8F0 50%, #A0A0A8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {MONTHS[selectedMonth]}
          </span>
          <div
            style={{
              width: 18,
              height: 1,
              marginTop: 5,
              background: "linear-gradient(to right, transparent, rgba(167,139,250,0.45), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
