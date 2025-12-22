import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next.js 15: params is a Promise
) {
  try {
    const { userId } = await auth();
    // Resolving params properly for Next.js 15
    const { id } = await params;

    // Optional: Protect this route so only the owner can check status
    // if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const video = await db.video.findUnique({
      where: { id },
      include: { frames: true } // Include frames to see if any are ready
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(video);

  } catch (error) {
    console.error("Fetch Video Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}