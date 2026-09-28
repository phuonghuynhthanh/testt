export function resizeImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      // Giữ tỉ lệ
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas not supported");

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject("Blob error");

          const newFile = new File([blob], file.name, {
            type: "image/jpeg",
          });

          resolve(newFile);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = reject;
    img.src = url;
  });
}

export async function resizeUntilOk(file: File) {
  let quality = 0.9;
  let resized = file;

  while (quality > 0.4) {
    resized = await resizeImage(file, 1920, 1920, quality);
    if (resized.size <= 4 * 1024 * 1024) return resized;
    quality -= 0.1;
  }

  return resized;
}
