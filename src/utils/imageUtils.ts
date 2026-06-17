const MAX_BYTES = 10 * 1024 * 1024; // 10 MB input limit
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED.includes(file.type))
    return "Please use a JPEG, PNG, or WebP image.";
  if (file.size > MAX_BYTES) return "Image must be under 10 MB.";
  return null;
};

/**
 * Resize an image to max 640×640 and compress to JPEG in browser memory.
 * Returns a Blob — never written to disk.
 */
export const resizeToBlob = (
  file: File,
  maxDim = 640,
  quality = 0.88
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });