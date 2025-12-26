// app/api/videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/prisma"; 
import { auth } from "@clerk/nextjs/server";

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

    // 3. Validate Required Fields (Strict Schema Match)
    if (!originalUrl || !publicId || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 4. Create Video Record
    // ⚠️ removed 'title' and 'description' because they are not in your schema
    const newVideo = await prisma.video.create({
      data: {
        userId,
        publicId,
        originalUrl,
        originalName: originalName || "Untitled Video",
        duration: parseFloat(duration), // Ensure float
        status: "processing", // Explicitly set status
      },
    });

    return NextResponse.json(newVideo);

  } catch (error) {
    console.error("Error saving video to DB:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}