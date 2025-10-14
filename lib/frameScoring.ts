import Jimp from 'jimp';

export async function scoreImage(imgPath: string) {
  const img = await Jimp.read(imgPath);

  // Laplacian-like kernel → sharpness proxy
  const lap = img.clone().convolute([
    [0,  1, 0],
    [1, -4, 1],
    [0,  1, 0],
  ]);

  const data = lap.bitmap.data;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;

  let score = variance;

  // brightness heuristic bonus
  const d = img.bitmap.data;
  const avg = d.reduce((a, b) => a + b, 0) / d.length;
  if (avg > 80 && avg < 220) score += 500;

  return score;
}
