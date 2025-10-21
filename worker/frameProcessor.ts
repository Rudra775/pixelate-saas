import { Worker } from 'bullmq';
import { redisConfig } from '@/lib/redis';
import { scoreImage } from '@/lib/frameScoring';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import cloudinary from '@/lib/cloudinary';

ffmpeg.setFfmpegPath(ffmpegPath as string);

// -------------- Extract frames from video ---------------- //
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

// -------------- Worker Setup ---------------- //
const worker = new Worker(
  'video-processing',

  // Job processor function
  async (job) => {
    const { filePath } = job.data as { filePath: string };
    console.log(`[${job.id}] processing ${filePath}`);

    try {
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

      console.log(`[${job.id}] Best frame picked: ${path.basename(best)}`);

      // Upload to Cloudinary
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

      console.log(`[${job.id}] Uploaded to Cloudinary: ${(uploadResult as any).secure_url}`);

      // Clean up local temp files safely
      try {
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.rmSync(filePath, { force: true });
      } catch (err) {
        console.warn(`[${job.id}] cleanup failed:`, err);
      }

      return {
        url: (uploadResult as any).secure_url,
        public_id: (uploadResult as any).public_id,
      };

    } catch (err: any) {
      console.error(`[${job.id}] failed:`, err.message);

      // rethrow — BullMQ will mark the job as failed & trigger retry
      throw err;
    }
  },

  {
    connection: redisConfig,
    concurrency: 2,
  }
);

// -------------- Event Hooks ---------------- //
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempt(s): ${err.message}`);
});

// -------------- Graceful Shutdown ---------------- //
process.on('SIGTERM', async () => {
  console.log('Graceful shutdown initiated...');
  await worker.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

console.log('Worker started (with retries + fault tolerance)');
