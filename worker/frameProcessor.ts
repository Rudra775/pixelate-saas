import "dotenv/config";
import { Worker } from "bullmq";
// Import Redis class + the new config exports
import { Redis } from "ioredis"; 
import { redisUrl, redisConnectionOptions } from "@/lib/redis";

import { scoreImage } from "@/lib/frameScoring";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "@ffprobe-installer/ffprobe";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import cloudinary from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";
import { UploadApiResponse } from "cloudinary";
import http from "http";

// 1. START THE SERVER FIRST (So Render sees the port immediately)
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Worker is alive");
});

server.listen(port, () => {
  console.log(`✅ Health check server listening on port ${port}`);
});

// 2. THEN Start the Worker

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ... (Helper functions downloadVideo and extractFrames stay exactly the same) ...
// ... I'll skip pasting them to save space, keep them as they are ...
import { pipeline } from "stream/promises";

async function downloadVideo(url: string, destPath: string) {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  if (response.status < 200 || response.status >= 300) throw new Error(`Bad status: ${response.status}`);
  const writer = fs.createWriteStream(destPath);
  await pipeline(response.data, writer);
  return destPath;
}

function extractFrames(videoPath: string, outDir: string, count = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    ffmpeg(videoPath)
      .on("end", () => {
        try {
          const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jpg")).map((f) => path.join(outDir, f));
          resolve(files);
        } catch (e) { reject(e); }
      })
      .on("error", (err) => reject(err))
      .screenshots({ count, folder: outDir, filename: "frame-%02d.jpg" });
  });
}

// ---------------- Worker Logic ---------------- //
const worker = new Worker(
  "video-processing",
  async (job) => {
    // ... (Your existing job logic stays exactly the same) ...
    const { videoId, videoUrl, userId, originalName } = job.data as {
      videoId: string;
      videoUrl: string;
      userId: string;
      originalName: string;
    };

    const jobLogger = logger.child({ jobId: job.id });
    jobLogger.info(`🎬 Processing job for Video ID: ${videoId}`);

    const tempDir = os.tmpdir();
    const tempVideoPath = path.join(tempDir, `job-${job.id}.mp4`);
    const framesDir = path.join(tempDir, `frames-${job.id}`);

    try {
      jobLogger.info(`📥 Downloading video from ${videoUrl}...`);
      await downloadVideo(videoUrl, tempVideoPath);
      jobLogger.info("✅ Download complete.");

      const [frames, aiMetadata] = await Promise.all([
        extractFrames(tempVideoPath, framesDir, 5),
        (async () => {
          try {
            jobLogger.info("🧠 Starting AI Analysis...");
            const audioUrl = videoUrl.replace(/\.[^/.]+$/, ".mp3");
            const transcriptionResponse = await getTranscript(audioUrl);
            const transcript = typeof transcriptionResponse === 'string' ? transcriptionResponse : transcriptionResponse?.text || '';
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

      scoredFrames.sort((a, b) => b.score - a.score);
      const best = scoredFrames[0];
      
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload(best.framePath, { folder: "pixelate/thumbnails" }, (err, res) => (err || !res ? reject(err) : resolve(res)));
      });

      await db.video.update({
        where: { id: videoId },
        data: {
          status: "completed",
          transcript: aiMetadata?.transcript || null,
          socialData: aiMetadata?.socialData || undefined,
        }
      });

      await db.processedFrame.create({
        data: {
          userId,
          videoId,
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          score: best.score,
        }
      });

      jobLogger.info("✅ Job Completed Successfully!");
      return { success: true };

    } catch (err: any) {
      await db.video.update({ where: { id: videoId }, data: { status: "failed" } });
      jobLogger.error(`❌ Job Failed: ${err.message}`);
      throw err;
    } finally {
      try {
        await Promise.all([
           fs.promises.rm(framesDir, { recursive: true, force: true }).catch(() => {}),
           fs.promises.unlink(tempVideoPath).catch(() => {})
        ]);
      } catch (e) { /* ignore */ }
    }
  },
  { 
    // 👇 CHANGE 2: Create a NEW connection using the exported URL + Options
    // This forces the worker to use its own SSL-enabled connection
    connection: new Redis(redisUrl, redisConnectionOptions),
    concurrency: 1
  }
);

worker.on("completed", (job) => logger.info(`✅ Job ${job.id} Finished`));
worker.on("failed", (job, err) => logger.error(`❌ Job ${job?.id} Failed: ${err.message}`));
