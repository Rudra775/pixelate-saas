import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { videoQueue } from "@/lib/jobQueue"; // CRITICAL IMPORT

export async function POST(request: NextRequest) {
  try {
    // 1. Check Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { originalUrl, publicId, duration, originalName } = body;

    // 3. Validate
    if (!originalUrl || !publicId || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 4. Create DB Record (Matches your Neon Schema)
    const newVideo = await prisma.video.create({
      data: {
        userId,
        publicId,
        originalUrl,
        originalName: originalName || "Untitled Video",
        duration: parseFloat(duration),
        status: "processing", 
      },
    });

    // 5. TRIGGER WORKER
    console.log(" Sending job to Redis for video:", newVideo.id);
    
    await videoQueue.add("video-processing", {
      videoId: newVideo.id,
      videoUrl: originalUrl,
      userId,
      originalName: newVideo.originalName
    });

    return NextResponse.json(newVideo);

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}