import "dotenv/config";
import { Worker } from "bullmq";
import http from "http";
import { v2 as cloudinary } from "cloudinary";

// Local Lib Imports
import { connection as sharedRedisConnection } from "@/lib/redis";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper";
import { logger } from "@/lib/logger";
import { db } from "@/lib/prisma";

// ------------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------------

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------------------------------------------------------
// 2. HEALTH CHECK SERVER
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
    const { videoId, userId, cloudPublicId, cloudSecureUrl } = job.data;
    
    const jobLogger = logger.child({ jobId: job.id });
    jobLogger.info(`🎬 Processing Job: ${job.id} | Video ID: ${videoId}`);

    try {
      // --------------------------------------------------------------
      // STEP 1: CONSTRUCT RESOURCE URLs
      // --------------------------------------------------------------
      const audioUrl = cloudinary.url(cloudPublicId, { 
        resource_type: "video", 
        format: "mp3" 
      });

      jobLogger.info(`🎵 Generated Audio URL`);

// --------------------------------------------------------------
      // STEP 2: GENERATE AI ASSETS (Thumbnails & Smart Crops)
      // --------------------------------------------------------------
      const timestamps = ["20p", "50p", "99p"];
      const frameUrls = [];

      for (const time of timestamps) {
        // 1. Landscape AI Thumbnail
        // 🟢 FIX: We manually construct the URL to ensure it's an IMAGE
        // SDK Method: cloudinary.url() can be tricky with video-to-image
        const landscapeUrl = cloudinary.url(cloudPublicId, {
          resource_type: "video",
          format: "jpg", // Force Image
          start_offset: time,
          width: 800,
          height: 450,
          crop: "fill", 
          gravity: "auto",
          // 🔴 REMOVE: quality: "auto" (This sometimes forces video format)
        });

        // 2. Portrait "Story" Crop
        const portraitUrl = cloudinary.url(cloudPublicId, {
          resource_type: "video",
          format: "jpg", // Force Image
          start_offset: time,
          width: 1080,
          height: 1920,
          crop: "fill",
          gravity: "auto",
        });

        frameUrls.push(landscapeUrl, portraitUrl);
      }

      jobLogger.info(`📸 Generated ${frameUrls.length} AI-Cropped Assets`);

      // --------------------------------------------------------------
      // STEP 3: AI TRANSCRIPTION & ANALYSIS
      // --------------------------------------------------------------
      jobLogger.info("🧠 Starting AI Analysis...");
      
      let aiMetadata = { transcript: "", socialData: null };

      try {
        // 🟢 FIX: We now get a string directly, no need to check for .text
        const transcript = await getTranscript(audioUrl);
        
        if (transcript) {
          const socialData = await generateSocialInfo(transcript);
          aiMetadata = { transcript, socialData };
        }
      } catch (aiError) {
        jobLogger.error(`⚠️ AI Analysis warning: ${aiError}`);
      }

      // --------------------------------------------------------------
      // STEP 4: DATABASE UPDATES
      // --------------------------------------------------------------
      jobLogger.info("💾 Saving to Database...");

      // 1. Update Main Video Record
      await db.video.update({
        where: { id: videoId },
        data: {
          status: "completed",
          originalUrl: cloudSecureUrl,
          transcript: aiMetadata.transcript,
          socialData: aiMetadata.socialData || undefined,
        }
      });

      // 2. Save Processed Frames
      await Promise.all(
        frameUrls.map((url, index) => 
          db.processedFrame.create({
            data: {
              userId,
              videoId,
              imageUrl: url,
              publicId: `${cloudPublicId}-frame-${index}`, 
              score: 10 - index, 
            }
          })
        )
      );

      jobLogger.info("✅ Job Completed Successfully!");
      return { success: true, videoId };

    } catch (err: any) {
      jobLogger.error(`❌ Job Failed: ${err.message}`);
      await db.video.update({ 
        where: { id: videoId }, 
        data: { status: "failed" } 
      });
      throw err;
    }
  },
  {
    connection: sharedRedisConnection,
    concurrency: 5
  }
);

worker.on("completed", (job) => logger.info(`✅ Job ${job.id} Finished`));
worker.on("failed", (job, err) => logger.error(`❌ Job ${job?.id} Failed: ${err.message}`));
