import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db as prisma } from "@/lib/prisma";
import { Queue } from "bullmq";
import { connection } from "@/lib/redis"; // Your shared Redis connection

// Initialize Queue (Producer Side)
const processingQueue = new Queue("video-processing", { connection });

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Get Data from Frontend (Cloudinary Response)
    const body = await request.json();
    const { publicId, secureUrl, originalName, duration } = body;

    if (!publicId || !secureUrl) {
      return new NextResponse("Missing file data", { status: 400 });
    }

    // 2. Create DB Record (Initial Status: 'processing')
    const video = await prisma.video.create({
      data: {
        userId,
        title: originalName || "Untitled Video",
        originalName: originalName || "unknown",
        originalUrl: secureUrl,
        status: "processing", // Worker will change this to 'completed'
        duration: duration || 0,
        muxUploadId: publicId, // Reusing this column for Cloudinary Public ID
      },
    });

    // 3. Add Job to Redis Queue 🚀
    // This wakes up your worker.ts
    await processingQueue.add("process-video", {
      videoId: video.id,
      userId: userId,
      cloudPublicId: publicId,
      cloudSecureUrl: secureUrl,
    });

    console.log(`✅ Job Added to Queue for Video: ${video.id}`);

    return NextResponse.json({ 
      success: true, 
      videoId: video.id,
      message: "Video queued for processing" 
    });

  } catch (error) {
    console.error("Queue Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}