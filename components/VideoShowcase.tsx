"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://rjfbavmupiypxiqzksxo.supabase.co/storage/v1/object/public/landing";

const SHOWCASE_VIDEOS = [
  "copy_221045C5-ED97-44E4-BE17-69CE58D9C7B8.MOV",
  "copy_535BAA2F-CFE0-47A6-A9FD-4A9FD381D81F.MOV",
  "copy_6B636B42-BC2D-4DC6-A759-6FA7995A5003.MOV",
  "copy_A066E860-B32E-4B05-A118-39253ABE621C.MOV",
  "copy_A6E4E42D-6DDD-4FE2-9195-19F8A398DB1E.MOV",
  "copy_D0811827-A8E2-447F-8AAA-DE81FC7D0B00.MOV",
  "copy_D635023B-C7CB-4225-8081-B9CD99AC074F.MOV",
  "copy_F96FBB64-37F2-4423-A85B-7DAEE077D4BF.MOV",
  "copy_FA6FD2AF-9726-4F87-AA6A-9FC428A8EE39.MOV",
].map((f) => `${SUPABASE_URL}/${f}`);


export default function VideoShowcase() {
  const [active, setActive] = useState(4);
  const [isMobile, setIsMobile] = useState(true);
  // Track which video indices have unlocked src (once loaded, always loaded)
  // Pre-unlock all 7 visible cards around initial active=4
  const [loadedSet, setLoadedSet] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6, 7]));
  // Whether the carousel section is near the viewport
  const [sectionVisible, setSectionVisible] = useState(false);
  // Captured first-frame posters for side cards (index → data URI)
  const [posterMap, setPosterMap] = useState<Record<number, string>>({});

  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const total = SHOWCASE_VIDEOS.length;

  // Ref that always holds the current active index — used in event listeners
  // that would otherwise capture a stale closure value.
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

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

  // As soon as the section is visible, force-load side cards so the browser
  // starts fetching metadata (and later we can capture the first frame).
  // On iOS this does nothing until a user gesture, but fires immediately on
  // Android / desktop — so side cards get their posters sooner there.
  useEffect(() => {
    if (!sectionVisible) return;
    videoRefs.current.forEach((v, i) => {
      if (!v || i === activeRef.current) return;
      if (v.readyState < 1) v.load();
    });
  }, [sectionVisible]);

  // BUG FIX: play/pause effect now includes sectionVisible in deps.
  useEffect(() => {
    if (!sectionVisible) return; // src not set yet — nothing to play
    videoRefs.current.forEach((v, i) => {
      if (!v || !v.src) return;

      let off = i - active;
      if (off > total / 2) off -= total;
      if (off < -total / 2) off += total;

      if (i === active) {
        v.play().catch(() => {});
      } else {
        v.pause();
        if (Math.abs(off) > 2) {
          v.currentTime = 0;
        }
      }
    });
  }, [active, loadedSet, sectionVisible, total]);

  // BUG FIX: on first touch, force-load all carousel videos and play the active
  // one. On iOS Safari, autoplay is blocked until the first user gesture.
  useEffect(() => {
    const onFirstTouch = () => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (v.readyState < 1) v.load();
        if (i === activeRef.current) v.play().catch(() => {});
      });
    };
    document.addEventListener("touchstart", onFirstTouch, { once: true, passive: true });
    return () => document.removeEventListener("touchstart", onFirstTouch);
  }, []);

  // Capture the first visible frame of a video and store it as a poster data URI.
  // Called from onSeeked (after we seek to 0.1s in onLoadedMetadata).
  // On iOS, canvas.drawImage on a paused video can return a blank frame — the
  // try/catch silently discards that; the gradient fallback covers the card.
  const captureFrame = useCallback((video: HTMLVideoElement, index: number) => {
    try {
      const w = video.videoWidth || 220;
      const h = video.videoHeight || 391;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const url = canvas.toDataURL("image/jpeg", 0.65);
      // toDataURL returns "data:image/jpeg;base64,/9j/4AAQS..." for real frames
      // and a minimal header for blank canvases — skip suspiciously short results
      if (url.length < 200) return;
      setPosterMap((prev) => ({ ...prev, [index]: url }));
    } catch {
      // cross-origin or tainted canvas — ignore
    }
  }, []);

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
              // Fallback: subtle glass gradient so cards never appear as solid black
              // while the video/poster is still loading.
              background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06))",
            }}>
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={videoSrc}
                muted loop playsInline
                preload={isActive ? "auto" : "metadata"}
                // Captured first frame — shows immediately once metadata loads,
                // so side cards are never blank even when paused on iOS.
                poster={isActive ? undefined : posterMap[i]}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
                onLoadedMetadata={isActive ? undefined : (e) => {
                  // Seek 0.1s ahead so we get a real frame (t=0 is often black)
                  const v = e.target as HTMLVideoElement;
                  if (v.seekable.length > 0 && v.duration > 0.1) {
                    v.currentTime = 0.1;
                  } else {
                    // Can't seek (e.g. live stream) — try to capture immediately
                    requestAnimationFrame(() => captureFrame(v, i));
                  }
                }}
                onSeeked={isActive ? undefined : (e) => {
                  // Frame is ready after the seek — capture it
                  requestAnimationFrame(() => captureFrame(e.target as HTMLVideoElement, i));
                }}
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
      <div className="fy-hero-glow" style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 200, height: 80,
        background: "radial-gradient(ellipse, rgba(0,255,174,0.06), transparent 70%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />
    </section>
  );
}
