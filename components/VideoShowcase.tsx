"use client";
import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing";

const SHOWCASE_VIDEOS = Array.from({ length: 10 }, (_, i) =>
  `${SUPABASE_URL}/video-${String(i + 1).padStart(2, "0")}.mp4`
);

export default function VideoShowcase() {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const total = SHOWCASE_VIDEOS.length;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) v.play().catch(() => {});
      else v.pause();
    });
  }, [active]);

  const W = isMobile ? 140 : 180;
  const H = isMobile ? 249 : 320;
  const ROT = isMobile ? 10 : 14;

  function onDown(e: React.PointerEvent) {
    dragging.current = true;
    startX.current = e.clientX;
    deltaX.current = 0;
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    deltaX.current = e.clientX - startX.current;
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (deltaX.current < -40 && active < total - 1) setActive(p => p + 1);
    else if (deltaX.current > 40 && active > 0) setActive(p => p - 1);
    deltaX.current = 0;
  }

  return (
    <section style={{ padding: "100px 0 16px", overflow: "hidden", position: "relative" }}>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: H + 40, position: "relative", cursor: "grab",
          touchAction: "pan-y", userSelect: "none",
        }}
      >
        {SHOWCASE_VIDEOS.map((src, i) => {
          const off = i - active;
          const isActive = off === 0;
          if (Math.abs(off) > 3) return null;

          const tx = off * (W * 0.65 + 12);
          const rot = isActive ? 0 : off > 0 ? ROT : -ROT;
          const sc = isActive ? 1 : 0.85 - Math.abs(off) * 0.05;
          const op = isActive ? 1 : Math.max(0.3, 1 - Math.abs(off) * 0.25);

          return (
            <div key={i} onClick={() => setActive(i)} style={{
              position: "absolute", width: W, height: H, borderRadius: 20, overflow: "hidden",
              transform: `translateX(${tx}px) rotate(${rot}deg) scale(${sc})`,
              zIndex: 10 - Math.abs(off), opacity: op,
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              cursor: isActive ? "default" : "pointer",
              boxShadow: isActive ? "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,174,0.08)" : "0 10px 30px rgba(0,0,0,0.3)",
              border: isActive ? "2px solid rgba(0,255,174,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <video
                ref={el => { videoRefs.current[i] = el; }}
                src={Math.abs(off) <= 1 ? src : undefined}
                muted loop playsInline
                preload={Math.abs(off) <= 1 ? "metadata" : "none"}
                style={{ width: "100%", height: "100%", objectFit: "cover", background: "#0a0a0a" }}
                onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
              />
              {/* Placeholder se vídeo não carrega */}
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(135deg, hsl(${i * 36}, 70%, 30%), hsl(${i * 36 + 30}, 70%, 15%))`,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: -1,
              }}>
                <span style={{ fontSize: 40, opacity: 0.3 }}>🍽️</span>
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))", pointerEvents: "none",
              }} />
            </div>
          );
        })}
      </div>
      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
        {SHOWCASE_VIDEOS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            width: active === i ? 20 : 6, height: 6, borderRadius: 3,
            background: active === i ? "#00ffae" : "rgba(255,255,255,0.15)",
            border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0,
          }} />
        ))}
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 200, height: 80,
        background: "radial-gradient(ellipse, rgba(0,255,174,0.06), transparent 70%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />
    </section>
  );
}
