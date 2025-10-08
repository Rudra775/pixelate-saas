// lib/frameScoring.ts
import Jimp from 'jimp';

export async function scoreImage(imgPath: string) {
  const img = await Jimp.read(imgPath);
  const lap = img.clone().convolute([
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0],
  ]);
  const pixels = lap.bitmap.data;
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;

  let score = variance;
  const brightness = img.bitmap.data.reduce((a, b) => a + b, 0) / pixels.length;
  if (brightness > 80 && brightness < 220) score += 500;

  return score;
}
