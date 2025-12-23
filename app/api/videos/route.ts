import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { videoQueue } from "@/lib/jobQueue";

// 1. GET: Fetch all videos for the Dashboard Grid
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Simple Pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 9;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      db.video.count({ where: { userId } }),
    ]);

    return NextResponse.json({ videos, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: "Database Error" }, { status: 500 });
  }
}

// 2. POST: The "Trigger" - Save DB record & Start Job
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { publicId, originalName, duration, originalUrl } = body;

    if (!publicId || !originalUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // A. Create Database Record
    const video = await db.video.create({
      data: {
        userId,
        publicId,
        originalName: originalName || "Untitled",
        duration: duration || 0,
        originalUrl,
        status: "processing", // Initial status
      },
    });

    // B. Add to BullMQ (Redis) for Background AI Processing
    await videoQueue.add("process-video", {
      videoId: video.id,
      videoUrl: originalUrl,
      userId,
      originalName
    });

    return NextResponse.json({ success: true, videoId: video.id });

  } catch (error) {
    console.error("Trigger Error:", error);
    return NextResponse.json({ error: "Failed to process video" }, { status: 500 });
  }
}