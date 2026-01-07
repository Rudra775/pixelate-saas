import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import http from "http";
import Mux from "@mux/mux-node";
import { v2 as cloudinary } from "cloudinary";

// Local Lib Imports
import { redisUrl, redisConnectionOptions, connection as sharedRedisConnection } from "@/lib/redis";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

// ------------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------------

// Mux Setup
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------------------------------------------------------
// 2. HEALTH CHECK SERVER (Required for Render)
// ------------------------------------------------------------------
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Worker is alive");
});

server.listen(port, () => {
  console.log(`✅ Health check server listening on port ${port}`);
});

// ------------------------------------------------------------------
// 3. WORKER LOGIC
// ------------------------------------------------------------------

const worker = new Worker(
  "video-processing",
  async (job) => {
    // We now receive the Mux Upload ID instead of a raw video URL
    const { muxUploadId, userId, videoId } = job.data;
    
    const jobLogger = logger.child({ jobId: job.id });
    jobLogger.info(`🎬 Processing Job: ${job.id} | Mux Upload ID: ${muxUploadId}`);

    try {
      // --------------------------------------------------------------
      // STEP 1: RESOLVE MUX ASSET
      // --------------------------------------------------------------
      jobLogger.info("⏳ Retrieving Mux Asset...");
      const upload = await mux.video.uploads.retrieve(muxUploadId);
      const assetId = upload.asset_id;

      if (!assetId) {
        throw new Error("Mux Asset ID not found. Upload might still be processing.");
      }

      // --------------------------------------------------------------
      // STEP 2: WAIT FOR MUX PROCESSING (POLLING)
      // --------------------------------------------------------------
      // Note: In a large scale app, use Webhooks. For this demo, polling is fine.
      let asset = await mux.video.assets.retrieve(assetId);
      let attempts = 0;
      
      while (asset.status !== "ready") {
        if (asset.status === "errored") throw new Error("Mux processing failed on their side.");
        if (attempts > 60) throw new Error("Mux processing timed out (2 mins)."); // Safety break

        jobLogger.info(`⏳ Waiting for Mux... Status: ${asset.status}`);
        await new Promise((r) => setTimeout(r, 2000)); // Wait 2s
        asset = await mux.video.assets.retrieve(assetId);
        attempts++;
      }

      const playbackId = asset.playback_ids?.[0]?.id;
      if (!playbackId) throw new Error("No Playback ID found for this asset.");

      jobLogger.info(`✅ Mux Ready! Playback ID: ${playbackId}`);

      // --------------------------------------------------------------
      // STEP 3: HYBRID PIPELINE (FETCH RESOURCES)
      // --------------------------------------------------------------
      
      // A. Get Audio URL (Instant Mux Link)
      // This requires 'mp4_support: "standard"' in your upload settings
      const audioUrl = `https://stream.mux.com/${playbackId}/audio.m4a`;

      // B. Get Frame URLs (Instant Mux Links)
      // We grab frames at 2s, 5s, and 10s marks
      const timeOffsets = [2, 5, 10];
      const muxFrameUrls = timeOffsets.map(
        (time) => `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`
      );

      // --------------------------------------------------------------
      // STEP 4: AI TRANSCRIPTION & ANALYSIS
      // --------------------------------------------------------------
      jobLogger.info("🧠 Starting AI Analysis...");
      
      let aiMetadata = { transcript: "", socialData: null };

      try {
        const transcriptResponse = await getTranscript(audioUrl);
        const transcript = typeof transcriptResponse === 'string' 
          ? transcriptResponse 
          : transcriptResponse?.text || '';

        if (transcript) {
          const socialData = await generateSocialInfo(transcript);
          aiMetadata = { transcript, socialData };
        }
      } catch (aiError) {
        jobLogger.error(`⚠️ AI Analysis warning (continuing anyway): ${aiError}`);
        // We continue even if AI fails, so we at least save the video/thumbnails
      }

      // --------------------------------------------------------------
      // STEP 5: CLOUDINARY UPLOAD (HYBRID THUMBNAILS)
      // --------------------------------------------------------------
      jobLogger.info("☁️ Uploading 'Proxy Frames' to Cloudinary...");

      const processedFrames = [];

      for (const url of muxFrameUrls) {
        // Upload the Mux URL directly to Cloudinary
        const cloudRes = await cloudinary.uploader.upload(url, {
          folder: "pixelate-thumbnails",
          // Optional: Add tags or context here
        });

        processedFrames.push({
          secure_url: cloudRes.secure_url,
          public_id: cloudRes.public_id
        });
      }

      // --------------------------------------------------------------
      // STEP 6: DATABASE UPDATES
      // --------------------------------------------------------------
      jobLogger.info("💾 Saving to Database...");

      // 1. Update the Main Video Record
      // We map the Mux Playback ID to the video so the frontend can play it
      await db.video.update({
        where: { id: videoId },
        data: {
          status: "completed",
          muxPlaybackId: playbackId, // Ensure you added this column to Prisma!
          transcript: aiMetadata.transcript,
          socialData: aiMetadata.socialData || undefined,
        }
      });

      // 2. Save the Processed Frames
      // We no longer have local scores, so we default score to 0 or random
      // (Or you can implement a URL-based scoring function later)
      await Promise.all(
        processedFrames.map((frame, index) => 
          db.processedFrame.create({
            data: {
              userId,
              videoId,
              imageUrl: frame.secure_url,
              publicId: frame.public_id,
              score: 10 - index, // Dummy ranking: 1st frame = 10, 2nd = 9...
            }
          })
        )
      );

      jobLogger.info("✅ Job Completed Successfully!");
      return { success: true, playbackId };

    } catch (err: any) {
      // Fail safely
      jobLogger.error(`❌ Job Failed: ${err.message}`);
      await db.video.update({ 
        where: { id: videoId }, 
        data: { status: "failed" } 
      });
      throw err;
    }
  {
    // Reuse the shared Redis connection instance to reduce new connections
    connection: sharedRedisConnection,
    concurrency: 1 // Reduced to 1 to avoid overwhelming Redis (dev)
  }
);

// Event Listeners
worker.on("completed", (job) => logger.info(`✅ Job ${job.id} Finished`));
worker.on("failed", (job, err) => logger.error(`❌ Job ${job?.id} Failed: ${err.message}`));
