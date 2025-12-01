import { Worker } from "bullmq";
import { redisConfig } from "@/lib/redis";
import { scoreImage } from "@/lib/frameScoring";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "@ffprobe-installer/ffprobe";
import fs from "fs";
import path from "path";
import cloudinary from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// 🧠 Jimp fix — use named import for ESM
import { Jimp } from "jimp";
const readImage = Jimp.read

// ✅ Configure FFmpeg + FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath.path as string);

// ---------------- Extract frames from video ---------------- //
function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    ffmpeg(videoPath)
      .on("end", () => {
        const files = fs
          .readdirSync(outDir)
          .filter((f) => f.endsWith(".jpg"))
          .map((f) => path.join(outDir, f));
        resolve(files);
      })
      .on("error", reject)
      .screenshots({
        count,
        folder: outDir,
        filename: "frame-%02d.jpg",
      });
  });
}

// ---------------- Worker Setup ---------------- //
const worker = new Worker(
  "video-processing",
  async (job) => {
    const { filePath, userId } = job.data as { filePath: string; userId: string };
    logger.info(`🎬 [${job.id}] Processing ${filePath} for the user ${userId}`);

    try {
      const framesDir = path.join(path.dirname(filePath), path.basename(filePath) + "-frames");
      const frames = await extractFrames(filePath, framesDir, 5);

      let best = frames[0];
      let bestScore = -Infinity;

      for (const f of frames) {
        // 🧠 Fix: Jimp.read → readImage from import
        const score = await scoreImage(f);
        if (score > bestScore) {
          bestScore = score;
          best = f;
        }
      }

      logger.info(`[${job.id}] 🏆 Best frame picked: ${path.basename(best)} (score=${bestScore})`);

      // 🧪 Remove this artificial random failure line for real testing:
      // if (Math.random() < 0.9) throw new Error("Simulated Cloudinary upload failure");

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          best,
          {
            folder: "pixelate/best-frames",
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

      const uploadedUrl = (uploadResult as any).secure_url;
      const uploadedPublicId = (uploadResult as any).public_id;

      logger.info(`[${job.id}] ☁️ Uploaded to Cloudinary: ${(uploadResult as any).secure_url}`);

      const dbRecord = await prisma.processedFrame.create({
        data: {
          userId: userId,
          url: uploadedUrl,
          publicId: uploadedPublicId,
          score: bestScore
        }
      })

      logger.info(`[${job.id}] 💾 Saved to DB with ID: ${dbRecord.id}`);

      // 🧹 Clean up local temp files safely
      try {
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.rmSync(filePath, { force: true });
      } catch (err) {
        logger.warn(`[${job.id}] cleanup failed: ${err}`);
      }

      return {
        url: (uploadResult as any).secure_url,
        public_id: (uploadResult as any).public_id,
        bestScore,
        dbRecordId: dbRecord.id,
      };
    } catch (err: any) {
      logger.error(`[${job.id}] ❌ Failed: ${err.message}`);
      throw err; // BullMQ will handle retry
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
  }
);

// ---------------- Event Hooks ---------------- //
worker.on("completed", (job) => {
  logger.info(`✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  logger.error(`❌ [${job?.id}] Failed: ${err.message}`);
});

// ---------------- Graceful Shutdown ---------------- //
process.on("SIGTERM", async () => {
  logger.info("🧹 Graceful shutdown initiated...");
  await worker.close();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  logger.error("⚠️ Unhandled Rejection:", reason);
});

console.log("Worker started (with retries + fault tolerance)");

