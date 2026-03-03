import { inngest } from "./client";
import { db as prisma } from "@/lib/prisma";
import { getTranscript, generateSocialInfo } from "@/lib/ai-helper";

export const processVideo = inngest.createFunction(
  { id: "process-video-assets", retries: 3 },
  { event: "video/process.started" },
  async ({ event, step }) => {
    const { videoId, userId, cloudPublicId, cloudSecureUrl } = event.data;

    // STEP 1: Update Database to 'processing' (matching existing default)
    await step.run("update-db-status", async () => {
      return await prisma.video.update({
        where: { id: videoId },
        data: { status: "processing" },
      });
    });

    // STEP 2: Generate Smart Crop URL (Cloudinary Magic)
    const smartCropUrl = await step.run("generate-smart-crop", async () => {
      // Cloudinary g_auto smart crop for 9:16 portrait
      return cloudSecureUrl.replace("/upload/", "/upload/c_fill,g_auto,ar_9:16/");
    });

    // STEP 3: AI Transcription (Whisper/Groq)
    const transcript = await step.run("transcribe-video", async () => {
      const audioUrl = cloudSecureUrl.replace("/upload/", "/upload/f_mp3/").replace(/\.[^/.]+$/, ".mp3");
      const text = await getTranscript(audioUrl);
      return text;
    });

    // STEP 4: AI Social Post Generation (Llama 3)
    const socialPosts = await step.run("generate-social-content", async () => {
      return await generateSocialInfo(transcript);
    });

    // STEP 5: Final Database Update
    await step.run("finalize-assets", async () => {
      return await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "completed",
          transcript: transcript,
          smartCropUrl: smartCropUrl,
          socialData: socialPosts,
        },
      });
    });

    return { message: "Video processing complete", videoId };
  }
);
