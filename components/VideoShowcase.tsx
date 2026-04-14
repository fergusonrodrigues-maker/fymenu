"use client";
import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing";

const SHOWCASE_VIDEOS = [
  "IMG_5135.MOV",
  "IMG_7724.MOV",
  "IMG_6863.MOV",
  "IMG_6017.MOV",
  "IMG_5175.MOV",
  "IMG_7708.MOV",
  "IMG_7719.MOV",
  "IMG_5136.MOV",
  "IMG_7723.MOV",
  "IMG_5628.MOV",
  "IMG_7725.MOV",
].map((f) => `${SUPABASE_URL}/${f}`);


export default function VideoShowcase() {
  const [active, setActive] = useState(4);
  const [isMobile, setIsMobile] = useState(true);
  // Track which video indices have unlocked src (once loaded, always loaded)
  // Pre-unlock all 7 visible cards around initial active=4
  const [loadedSet, setLoadedSet] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6, 7]));
  // Whether the carousel section is near the viewport
  const [sectionVisible, setSectionVisible] = useState(false);

  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const total = SHOWCASE_VIDEOS.length;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // IntersectionObserver: only start loading when carousel enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // When active changes: unlock all visible cards (±3) so they can show poster
  useEffect(() => {
    setLoadedSet((s) => {
      const ns = new Set(s);
      for (let off = -3; off <= 3; off++) {
        ns.add((active + off + total) % total);
      }
      return ns;
    });
  }, [active, total]);

  // Separate effect: play/pause — runs after loadedSet re-render so src is set
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;

      // Compute circular offset
      let off = i - active;
      if (off > total / 2) off -= total;
      if (off < -total / 2) off += total;

      if (i === active) {
        v.play().catch(() => {});
      } else {
        v.pause();
        // Reset videos that are far from center to free decoder resources
        if (Math.abs(off) > 2) {
          v.currentTime = 0;
        }
      }
    });
  }, [active, loadedSet, total]);

  const W = isMobile ? 220 : 320;
  const H = isMobile ? 391 : 569;
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
    if (deltaX.current < -40) setActive((p) => (p + 1) % total);
    else if (deltaX.current > 40) setActive((p) => (p - 1 + total) % total);
    deltaX.current = 0;
  }

  return (
    <section ref={sectionRef} style={{ padding: "100px 0 0", overflow: "hidden", position: "relative" }}>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: H + 20, position: "relative", cursor: "grab",
          touchAction: "pan-y", userSelect: "none",
        }}
      >
        {SHOWCASE_VIDEOS.map((src, i) => {
          let off = i - active;
          if (off > total / 2) off -= total;
          if (off < -total / 2) off += total;
          const isActive = off === 0;
          if (Math.abs(off) > 3) return null;

          // Only set src if section is visible AND this index was unlocked
          const videoSrc = sectionVisible && loadedSet.has(i) ? src : undefined;

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
              background: "#111",
            }}>
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={videoSrc}
                muted loop playsInline
                preload={isActive ? "auto" : "metadata"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
              />
              {/* Gradient overlay at bottom */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))", pointerEvents: "none",
              }} />
            </div>
          );
        })}
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
