// Compress an image File via canvas. Resizes longest edge to MAX_DIM,
// outputs JPEG. Drops to lower quality if first pass exceeds 3MB.
// Throws if final size still exceeds the supplied hard cap (default 5MB).

export type CompressOptions = {
  maxDim?: number;
  primaryQuality?: number;
  fallbackQuality?: number;
  maxBytesHard?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxDim: 1600,
  primaryQuality: 0.85,
  fallbackQuality: 0.7,
  maxBytesHard: 5 * 1024 * 1024,
};

export function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const o = { ...DEFAULTS, ...opts };
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > o.maxDim || h > o.maxDim) {
        if (w > h) { h = Math.round((h * o.maxDim) / w); w = o.maxDim; }
        else       { w = Math.round((w * o.maxDim) / h); h = o.maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const outName = file.name.replace(/\.[^.]+$/, ".jpg") || "photo.jpg";

      canvas.toBlob((blob1) => {
        if (!blob1) return reject(new Error("Falha ao comprimir imagem"));
        if (blob1.size <= 3 * 1024 * 1024) {
          return resolve(new File([blob1], outName, { type: "image/jpeg" }));
        }
        canvas.toBlob((blob2) => {
          const finalBlob = blob2 ?? blob1;
          if (finalBlob.size > o.maxBytesHard) {
            return reject(new Error("Imagem muito grande, mesmo após compressão."));
          }
          resolve(new File([finalBlob], outName, { type: "image/jpeg" }));
        }, "image/jpeg", o.fallbackQuality);
      }, "image/jpeg", o.primaryQuality);
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem para compressão"));
    img.src = url;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}
