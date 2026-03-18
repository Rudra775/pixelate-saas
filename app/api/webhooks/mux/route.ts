import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';
import Webhooks from '@mux/mux-node';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Secrets
const webhookSecret = process.env.MUX_WEBHOOK_SECRET!;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // 1. Grab body and signature
    const body = await req.text();
    const headers = req.headers;
    const signature = headers.get('mux-signature');

    if (!signature || !webhookSecret) {
      console.error("Missing Signature or Secret");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Verify the Signature
    try {
      (Webhooks as any).verify(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook Signature Verification Failed");
      return new NextResponse("Invalid Signature", { status: 401 });
    }

    // 3. Parse and Process Event
    const event = JSON.parse(body);
    const { type, data } = event;

    if (type === 'video.asset.ready') {
      const playbackId = data.playback_ids?.[0]?.id;
      const uploadId = data.upload_id; 

      if (!uploadId) return new NextResponse("No Upload ID", { status: 200 });

      // Update Database
      await prisma.video.updateMany({
        where: { muxUploadId: uploadId },
        data: {
          status: 'ready',
          muxPlaybackId: playbackId,
          duration: data.duration,
        }
      });

      // Trigger Cloudinary
      if (playbackId) {
        const muxUrl = `https://stream.mux.com/${playbackId}/high.mp4`;
        
        // Fire and forget (don't await) to keep webhook fast
        cloudinary.uploader.upload(muxUrl, {
          resource_type: 'video',
          public_id: `pixelate-videos/${playbackId}`,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary`
        }).then((result) => {
             console.log("✅ Cloudinary Upload Success:", result.public_id);
        }).catch(err => {
             console.error("❌ Cloudinary Handoff Failed:", err);
        });
      }
    }

    return new NextResponse("Webhook Received", { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}