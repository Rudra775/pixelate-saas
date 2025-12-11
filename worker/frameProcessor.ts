import { Worker } from "bullmq";
import { redisConfig } from "@/lib/redis";
import { scoreImage } from "@/lib/frameScoring";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper"; // 👈 Import AI helpers
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "@ffprobe-installer/ffprobe";
import fs from "fs";
import path from "path";
import cloudinary from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { UploadApiResponse } from "cloudinary";

// ✅ Configure FFmpeg + FFprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ---------------- Extract frames from video ---------------- //
function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    ffmpeg(videoPath)
      .on("end", () => {
        try {
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
    // 👇 Added videoUrl to inputs
    const { filePath, userId, originalName, videoUrl } = job.data as {
      filePath: string;
      userId: string;
      originalName: string;
      videoUrl: string; // 👈 Needed for the Cloudinary Audio Hack
    };
    
    const jobLogger = logger.child({ jobId: job.id });
    jobLogger.info(`🎬 Processing ${originalName} for user ${userId}`);

    const framesDir = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}-frames`);

    try {
      // --- STEP 1: PARALLEL EXECUTION (Visuals + AI) ---
      // We run Frame Extraction AND AI generation at the same time to save time
      
      const [frames, aiMetadata] = await Promise.all([
        // Task A: Extract Frames (Visuals)
        extractFrames(filePath, framesDir, 5),

        // Task B: Generate AI Metadata (Text)
        (async () => {
          if (!videoUrl) {
            jobLogger.warn("⚠️ No videoUrl provided, skipping AI metadata generation.");
            return null;
          }
          try {
            jobLogger.info("🧠 Starting AI Analysis...");
            
            // 1. Cloudinary Hack: Change .mp4 (or similar) to .mp3
            // This forces Cloudinary to transcode to audio on-the-fly
            const audioUrl = videoUrl.replace(/\.[^/.]+$/, ".mp3");
            
            // 2. Transcribe
            const transcriptionResponse = await getTranscript(audioUrl);
            if (!transcriptionResponse) return null;
            
            // Extract text from Transcription object
            const transcript = typeof transcriptionResponse === 'string' ? transcriptionResponse : transcriptionResponse.text || '';
            if (!transcript) return null;

            // 3. Generate Social Posts
            const socialData = await generateSocialInfo(transcript);
            
            jobLogger.info("✅ AI Analysis Complete");
            return { transcript, socialData };
          } catch (error) {
            jobLogger.error(`❌ AI Failed: ${error}`);
            return null; // Don't fail the whole job if AI fails
          }
        })()
      ]);

      if (frames.length === 0) {
        throw new Error("FFmpeg failed to extract any frames.");
      }

      // --- STEP 2: SCORE FRAMES ---
      const scoredFrames = await Promise.all(
        frames.map(async (framePath) => {
          try {
            const score = await scoreImage(framePath);
            return { framePath, score };
          } catch (e) {
            jobLogger.warn(`Failed to score frame ${framePath}: ${e}`);
            return { framePath, score: -Infinity };
          }
        })
      );

      // --- STEP 3: FIND BEST FRAME ---
      scoredFrames.sort((a, b) => b.score - a.score);
      const best = scoredFrames[0];

      if (!best || best.score === -Infinity) {
        throw new Error("Could not determine a valid best frame.");
      }

      jobLogger.info(`🏆 Best frame: ${path.basename(best.framePath)} (Score: ${best.score})`);

      // --- STEP 4: UPLOAD BEST FRAME ---
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

      // --- STEP 5: SAVE TO DB (Combined Data) ---
      // We explicitly cast the Prisma call to avoid TS errors if your schema isn't perfectly synced yet
      // Ideally, ensure your ProcessedFrame model has 'transcript' and 'socialData' fields
      const dbRecord = await prisma.processedFrame.create({
        data: {
          userId: userId,
          videoName: originalName || "processed-video",
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          score: best.score,
        },
      });

      jobLogger.info(`💾 DB Record Created: ${dbRecord.id}`);

      return {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        bestScore: best.score,
        dbRecordId: dbRecord.id,
        aiData: !!aiMetadata // specific boolean to track success
      };

    } catch (err: any) {
      jobLogger.error(`❌ Failed: ${err.message}`);
      throw err;
    } finally {
      // --- STEP 6: CLEANUP ---
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
    concurrency: 2,
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