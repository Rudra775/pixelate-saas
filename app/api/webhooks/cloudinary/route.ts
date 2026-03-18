import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';
import { inngest } from '@/inngest/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // The webhook payload from Cloudinary
    const { public_id, secure_url, notification_type } = body;

    // We only care about explicit upload completions
    if (notification_type !== 'upload') {
      return new NextResponse("Not an upload event", { status: 200 });
    }

    // `public_id` is formatted as `pixelate-videos/${playbackId}` in the Mux webhook
    const playbackId = public_id.replace('pixelate-videos/', '');

    // Find the video by muxPlaybackId
    const video = await prisma.video.findFirst({
      where: { muxPlaybackId: playbackId },
    });

    if (!video) {
      console.error("Video not found for playback ID:", playbackId);
      return new NextResponse("Video not found", { status: 404 });
    }

    // Update DB with Cloudinary info
    await prisma.video.update({
      where: { id: video.id },
      data: {
        cloudinaryPublicId: public_id,
        cloudinarySecureUrl: secure_url,
      },
    });

    // Fire Inngest Event to start AI Processing via `video/process.started`
    await inngest.send({
      name: "video/process.started",
      data: {
        videoId: video.id,
        userId: video.userId,
        cloudPublicId: public_id,
        cloudSecureUrl: secure_url,
      },
    });

    console.log(`✅ Cloudinary Webhook processed. Inngest AI job started for video: ${video.id}`);

    return new NextResponse("Webhook Processed", { status: 200 });
  } catch (error) {
    console.error("Cloudinary Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
