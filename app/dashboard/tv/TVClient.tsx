"use client";

import { useRef, useState } from "react";
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

type Props = {
  unitId: string;
  unitName: string;
  slug: string;
  initialMedia: TVMedia[];
};

export default function TVClient({ unitId, unitName, slug, initialMedia }: Props) {
  const supabase = createClient();
  const [media, setMedia] = useState<TVMedia[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("horizontal");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${unitId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("tv")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("tv_media")
        .insert({
          unit_id: unitId,
          title: title.trim(),
          video_path: path,
          orientation,
          order_index: media.length,
          is_active: true,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setMedia((prev) => [...prev, data as TVMedia]);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(item: TVMedia) {
    const { error: err } = await supabase
      .from("tv_media")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (!err) {
      setMedia((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m))
      );
    }
  }

  async function deleteItem(item: TVMedia) {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    await supabase.storage.from("tv").remove([item.video_path]);
    if (item.thumb_path) await supabase.storage.from("tv").remove([item.thumb_path]);
    const { error: err } = await supabase.from("tv_media").delete().eq("id", item.id);
    if (!err) setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  const tvUrl = `/u/${slug}/tv`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modo TV</h1>
          <p className="text-sm text-muted-foreground">{unitName}</p>
        </div>
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline text-blue-600"
        >
          Abrir display público →
        </a>
      </div>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Adicionar vídeo</h2>
        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          required
        />
        <select
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as "vertical" | "horizontal")}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="horizontal">Horizontal (paisagem)</option>
          <option value="vertical">Vertical (retrato)</option>
        </select>
        <input type="file" accept="video/*" ref={fileRef} required className="text-sm" />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "Enviar vídeo"}
        </button>
      </form>

      {/* Media list */}
      <div className="space-y-3">
        <h2 className="font-semibold">Vídeos cadastrados ({media.length})</h2>
        {media.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum vídeo cadastrado.</p>
        )}
        {media.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border rounded-lg px-4 py-3 gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{item.orientation}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(item)}
                className={`text-xs px-2 py-1 rounded ${
                  item.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.is_active ? "Ativo" : "Inativo"}
              </button>
              <button
                onClick={() => deleteItem(item)}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
