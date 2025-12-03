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
import { UploadApiResponse } from "cloudinary"; // Type for better safety

// ✅ Configure FFmpeg + FFprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ---------------- Extract frames from video ---------------- //
function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Use Sync here is fine as it's just folder creation
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    ffmpeg(videoPath)
      .on("end", () => {
        try {
          // Read directory cleanly
          const files = fs
            .readdirSync(outDir)
            .filter((f) => f.endsWith(".jpg"))
            .map((f) => path.join(outDir, f));
          resolve(files);
        } catch (e) {
          reject(e);
        }
      })
      .on("error", (err) => reject(err))
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
    const { filePath, userId, originalName } = job.data as { 
      filePath: string; 
      userId: string; 
      originalName: string; // <--- Added this
    };
    const jobLogger = logger.child({ jobId: job.id }); // Child logger for cleaner context
    
    jobLogger.info(`🎬 Processing ${filePath} for user ${userId}`);

    const framesDir = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}-frames`);

    try {
      // 1. Extract Frames
      const frames = await extractFrames(filePath, framesDir, 5);

      if (frames.length === 0) {
        throw new Error("FFmpeg failed to extract any frames.");
      }

      // 2. Score Frames in Parallel (Performance Boost 🚀)
      // We map every frame to a promise and run them all at once
      const scoredFrames = await Promise.all(
        frames.map(async (framePath) => {
          try {
            const score = await scoreImage(framePath);
            return { framePath, score };
          } catch (e) {
            jobLogger.warn(`Failed to score frame ${framePath}: ${e}`);
            return { framePath, score: -Infinity }; // Penalize failed frames
          }
        })
      );

      // 3. Find Best Frame
      // Sort descending by score and pick top 1
      scoredFrames.sort((a, b) => b.score - a.score);
      const best = scoredFrames[0];

      if (!best || best.score === -Infinity) {
        throw new Error("Could not determine a valid best frame.");
      }

      jobLogger.info(`🏆 Best frame: ${path.basename(best.framePath)} (Score: ${best.score})`);

      // 4. Upload to Cloudinary
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload(
          best.framePath,
          {
            folder: "pixelate/best-frames",
            use_filename: true,
            unique_filename: false,
            overwrite: true,
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed"));
            else resolve(result);
          }
        );
      });

      jobLogger.info(`☁️ Uploaded: ${uploadResult.secure_url}`);

      // 5. Save to DB
      const dbRecord = await prisma.processedFrame.create({
        data: {
          userId: userId,
          videoName: originalName || "processed-video",
          
          imageUrl: uploadResult.secure_url, 
          publicId: uploadResult.public_id,
          score: best.score,
        }
      });

      jobLogger.info(`💾 DB Record Created: ${dbRecord.id}`);

      return {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        bestScore: best.score,
        dbRecordId: dbRecord.id,
      };

    } catch (err: any) {
      jobLogger.error(`❌ Failed: ${err.message}`);
      throw err; // Trigger BullMQ retry
    } finally {
      // 6. Async Cleanup (Always runs, success or fail)
      // Using Promise.all to delete both path and file concurrently
      try {
        await Promise.all([
           fs.promises.rm(framesDir, { recursive: true, force: true }).catch(() => {}),
           fs.promises.unlink(filePath).catch(() => {})
        ]);
        jobLogger.info("🧹 Cleanup complete");
      } catch (e) {
        jobLogger.warn(`Cleanup minor error: ${e}`);
      }
    }
  },
  {
    connection: redisConfig,
    concurrency: 2, // Process 2 videos at once
  }
);

// ---------------- Event Hooks ---------------- //
worker.on("completed", (job) => {
  logger.info(`✅ [${job.id}] Job Completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`❌ [${job?.id}] Job Failed: ${err.message}`);
});

console.log("🚀 Worker started and listening for jobs...");
