import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { videoQueue } from "@/lib/jobQueue"; 

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { publicId, originalUrl, originalName, duration, size } = body;

    if (!publicId || !originalUrl) {
      return NextResponse.json({ error: "Missing video data" }, { status: 400 });
    }

    // 1. Create DB Record
    const video = await db.video.create({
      data: {
        userId,
        // title: originalName || "Untitled Video",  <-- REMOVE (Not in Schema)
        originalName,
        publicId,
        // originalSize: String(size),               <-- REMOVE (Not in Schema)
        duration: duration,
        status: "processing",
        
        // 👇 ADD THIS (Required by Schema)
        originalUrl: originalUrl, 
      },
    });

    // 2. Add to Queue (Worker will pick this up)
    await videoQueue.add("process-video", {
      videoId: video.id,     
      videoUrl: originalUrl, 
      userId,
      originalName // Pass this so the worker can use it if needed
    });

    return NextResponse.json({ success: true, videoId: video.id });

  } catch (error) {
    console.error("Process Trigger Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}