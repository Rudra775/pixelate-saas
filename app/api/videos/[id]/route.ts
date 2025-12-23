import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";

// 1. GET: Fetch data for the Workstation (Player + AI Results)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next.js 15 Async Params
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
    });

    if (!video) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (video.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(video);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// 2. DELETE: Remove video from DB and Cloudinary
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // A. Check ownership
    const video = await db.video.findUnique({ where: { id } });
    if (!video || video.userId !== userId) {
      return NextResponse.json({ error: "Not Found or Forbidden" }, { status: 403 });
    }

    // B. Delete from Cloudinary (Cleanup)
    // Note: 'video' resource type is required for deleting videos
    try {
      if (video.publicId) {
        await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
      }
    } catch (cldError) {
      console.error("Cloudinary Delete Warning:", cldError);
      // We continue to delete from DB even if cloud delete fails
    }

    // C. Delete from Database
    await db.video.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete Failed" }, { status: 500 });
  }
}