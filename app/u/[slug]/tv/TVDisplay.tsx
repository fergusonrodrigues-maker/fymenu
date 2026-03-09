"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TVMedia {
  id: string;
  title: string;
  video_path: string;
  thumb_path: string | null;
  orientation: "vertical" | "horizontal";
  order_index: number;
  is_active: boolean;
}

interface Unit {
  id: string;
  name: string;
  slug: string;
}

export default function TVDisplay({
  unit,
  media,
}: {
  unit: Unit;
  media: TVMedia[];
}) {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [urls, setUrls] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Gera URLs assinadas para os vídeos
  useEffect(() => {
    if (media.length === 0) return;
    Promise.all(
      media.map(async (m) => {
        const { data } = await supabase.storage
          .from("tv")
          .createSignedUrl(m.video_path, 3600);
        return data?.signedUrl ?? "";
      })
    ).then((u) => {
      setUrls(u);
      setLoaded(true);
    });
  }, [media]);

  // Avança para o próximo vídeo ao terminar
  function handleEnded() {
    setCurrent((prev) => (prev + 1) % media.length);
  }

  // Troca a src do vídeo quando current muda
  useEffect(() => {
    if (!videoRef.current || urls.length === 0) return;
    videoRef.current.src = urls[current];
    videoRef.current.load();
    videoRef.current.play().catch(() => {});
  }, [current, urls]);

  if (media.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">📺</div>
        <p className="text-white text-xl font-medium">{unit.name}</p>
        <p className="text-gray-500 text-sm">Nenhum vídeo configurado</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentMedia = media[current];
  const isVertical = currentMedia.orientation === "vertical";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Vídeo */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        className={`${
          isVertical
            ? "h-screen w-auto max-w-full object-cover"
            : "w-screen h-auto max-h-screen object-cover"
        }`}
        style={{ background: "black" }}
      />

      {/* Overlay com nome do produto */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-8 py-10">
        <p className="text-white text-3xl font-bold drop-shadow-lg">
          {currentMedia.title}
        </p>
        <p className="text-white/60 text-sm mt-1">{unit.name}</p>
      </div>

      {/* Indicadores de posição */}
      {media.length > 1 && (
        <div className="absolute top-6 right-6 flex gap-2">
          {media.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-white scale-125" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
