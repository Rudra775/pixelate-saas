import "dotenv/config";
import { Worker } from "bullmq";
import { redisConfig } from "@/lib/redis";
import { scoreImage } from "@/lib/frameScoring";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "@ffprobe-installer/ffprobe";
import fs from "fs";
import path from "path";
import os from "os"; //  Needed for temp directory
import axios from "axios"; //  Needed to download video
import cloudinary from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma"; // Use the singleton DB
const prisma = db;
import { UploadApiResponse } from "cloudinary";

//  Configure FFmpeg + FFprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ---------------- Helper: Download Video ---------------- //
import { pipeline } from "stream/promises";

async function downloadVideo(url: string, destPath: string) {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  if (response.status < 200 || response.status >= 300) throw new Error(`Bad status: ${response.status}`);
  const writer = fs.createWriteStream(destPath);
  await pipeline(response.data, writer); // throws on error
  return destPath;
}

// ---------------- Helper: Extract Frames ---------------- //
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

// ---------------- Worker Logic ---------------- //
const worker = new Worker(
  "video-processing",
  async (job) => {
    // 👇 We now expect 'videoId' and 'videoUrl' from the API trigger
    const { videoId, videoUrl, userId, originalName } = job.data as {
      videoId: string;
      videoUrl: string;
      userId: string;
      originalName: string;
    };

    const jobLogger = logger.child({ jobId: job.id });
    jobLogger.info(`🎬 Processing job for Video ID: ${videoId}`);

    // Create a temp file path to download the video to
    const tempDir = os.tmpdir();
    const tempVideoPath = path.join(tempDir, `job-${job.id}.mp4`);
    const framesDir = path.join(tempDir, `frames-${job.id}`);

    try {
      // --- STEP 0: DOWNLOAD VIDEO ---
      jobLogger.info(`📥 Downloading video from ${videoUrl}...`);
      await downloadVideo(videoUrl, tempVideoPath);
      jobLogger.info("✅ Download complete.");

      // --- STEP 1: PARALLEL EXECUTION (Visuals + AI) ---
      const [frames, aiMetadata] = await Promise.all([
        // Task A: Extract Frames (Visuals) using the local temp file
        extractFrames(tempVideoPath, framesDir, 5),

        // Task B: Generate AI Metadata (Text) using the Cloudinary URL
        (async () => {
          try {
            jobLogger.info("🧠 Starting AI Analysis...");
            const audioUrl = videoUrl.replace(/\.[^/.]+$/, ".mp3");
            
            const transcriptionResponse = await getTranscript(audioUrl);
            const transcript = typeof transcriptionResponse === 'string' 
                ? transcriptionResponse 
                : transcriptionResponse?.text || '';

            if (!transcript) return null;

            const socialData = await generateSocialInfo(transcript);
            return { transcript, socialData };
          } catch (error) {
            jobLogger.error(`❌ AI Failed: ${error}`);
            return null;
          }
        })()
      ]);

      if (frames.length === 0) throw new Error("No frames extracted");

      // --- STEP 2: SCORE FRAMES ---
      const scoredFrames = await Promise.all(
        frames.map(async (framePath) => {
          try {
            const score = await scoreImage(framePath);
            return { framePath, score };
          } catch (e) {
            return { framePath, score: -Infinity };
          }
        })
      );

      // --- STEP 3: PICK BEST & UPLOAD ---
      scoredFrames.sort((a, b) => b.score - a.score);
      const best = scoredFrames[0];
      
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload(best.framePath, 
          { folder: "pixelate/thumbnails" }, 
          (err, res) => (err || !res ? reject(err) : resolve(res))
        );
      });

      // --- STEP 4: UPDATE DATABASE (Crucial!) ---
      
      // A. Update the Parent Video (Status & AI Data)
      await db.video.update({
        where: { id: videoId },
        data: {
          status: "completed",
          transcript: aiMetadata?.transcript || null,
          socialData: aiMetadata?.socialData || undefined,
        }
      });

      // B. Create the Frame Record (Linked to Video)
      await db.processedFrame.create({
        data: {
          userId,
          videoId, // Link to the parent video
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          score: best.score,
        }
      });

      jobLogger.info("✅ Job Completed Successfully!");
      return { success: true };

    } catch (err: any) {
      // If failed, mark video as failed in DB
      await db.video.update({
        where: { id: videoId },
        data: { status: "failed" }
      });
      jobLogger.error(`❌ Job Failed: ${err.message}`);
      throw err;
    } finally {
      // --- CLEANUP ---
      try {
        await Promise.all([
           fs.promises.rm(framesDir, { recursive: true, force: true }).catch(() => {}),
           fs.promises.unlink(tempVideoPath).catch(() => {})
        ]);
      } catch (e) { /* ignore */ }
    }
  },
  { connection: redisConfig, concurrency: 2 }
);

// Event hooks
worker.on("completed", (job) => logger.info(`✅ Job ${job.id} Finished`));
worker.on("failed", (job, err) => logger.error(`❌ Job ${job?.id} Failed: ${err.message}`));