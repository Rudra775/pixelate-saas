import { Worker } from 'bullmq';
import { redisConfig } from '@/lib/redis';
import { scoreImage } from '@/lib/frameScoring';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath as string);

function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // evenly spaced screenshots across the video
    ffmpeg(videoPath)
      .on('end', () => {
        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith('.jpg'))
          .map(f => path.join(outDir, f));
        resolve(files);
      })
      .on('error', reject)
      .screenshots({
        count,
        folder: outDir,
        filename: 'frame-%02d.jpg',
      });
  });
}

new Worker(
  'video-processing',
  async (job) => {
    const { filePath } = job.data as { filePath: string };
    console.log('🎬 processing', filePath);

    const framesDir = path.join(path.dirname(filePath), path.basename(filePath) + '-frames');
    const frames = await extractFrames(filePath, framesDir, 5);

    let best = frames[0];
    let bestScore = -Infinity;

    for (const f of frames) {
      const s = await scoreImage(f);
      if (s > bestScore) {
        bestScore = s;
        best = f;
      }
    }

    // expose result via /public so UI can view it
    const outDir = path.join(process.cwd(), 'public', 'outputs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${job.id}.jpg`);
    await fsp.copyFile(best, outFile);

    // optional: cleanup tmp later

    const publicUrl = `/outputs/${job.id}.jpg`;
    console.log('🏆 best frame ->', publicUrl);
    return { url: publicUrl };
  },
  { connection: redisConfig, concurrency: 2 }
);

console.log('👷 worker started');
