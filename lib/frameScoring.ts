// ...existing code...
import { Jimp } from "jimp";

export async function scoreImage(imgPath: string): Promise<number> {
  // read returns an Image instance for ESM build
  const img = await Jimp.read(imgPath) as any;

  // create laplacian-like image for sharpness proxy
  const lap = (img as any).clone().convolute([
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0],
  ]);

  // bitmap.data is a RGBA typed array (Uint8Array / Uint8ClampedArray)
  const lapData = lap.bitmap.data as Uint8Array;
  // build luminance array (one value per pixel) from RGBA buffer
  const pixels: number[] = [];
  for (let i = 0; i < lapData.length; i += 4) {
    const r = lapData[i];
    const g = lapData[i + 1];
    const b = lapData[i + 2];
    // standard luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    pixels.push(lum);
  }

  if (pixels.length === 0) return 0;

  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
  let score = variance;

  // brightness heuristic: compute avg luminance from original image
  const orig = img.bitmap.data as Uint8Array;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < orig.length; i += 4) {
    const r = orig[i];
    const g = orig[i + 1];
    const b = orig[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += lum;
    count++;
  }
  const avg = count ? sum / count : 0;
  if (avg > 80 && avg < 220) score += 500;

  return score;
}
// ...existing code...
