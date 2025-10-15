import { Worker } from 'bullmq';
import { redisConfig } from '@/lib/redis';
import { scoreImage } from '@/lib/frameScoring';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import cloudinary from '@/lib/cloudinary';

ffmpeg.setFfmpegPath(ffmpegPath as string);

function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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

    console.log('🏆 Best frame picked:', best);

    // ⬇ Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        best,
        {
          folder: 'pixelate/best-frames',
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    console.log('☁️ Uploaded to Cloudinary:', (uploadResult as any).secure_url);

    // return cloudinary URL as job result
    return {
      url: (uploadResult as any).secure_url,
      public_id: (uploadResult as any).public_id,
    };
  },
  { connection: redisConfig, concurrency: 2 }
);

console.log('👷 worker started with Cloudinary upload');
