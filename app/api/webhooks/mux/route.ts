// app/api/webhooks/mux/route.ts
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { db as prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mux = new Mux(); 

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const header = request.headers.get("mux-signature");
    
    // (Verification logic skipped for brevity - keep your existing verification code here!)
    // ... verification ...

    const json = JSON.parse(body);
    const { type, data } = json;

    // --- HANDLE EVENTS ---
    switch (type) {
      
      case 'video.upload.asset_created': {
        // ... (keep existing logic: link uploadId to assetId)
        await prisma.video.updateMany({
            where: { muxUploadId: data.id },
            data: { muxAssetId: data.asset_id, status: "processing" }
        });
        break;
      }

      case 'video.asset.ready': {
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const duration = data.duration ? data.duration / 1000 : 0;

        console.log(`Mux Asset Ready: ${assetId}. Syncing to Cloudinary...`);

        // --- THE NEW BRIDGE LOGIC ---
        // We construct the Mux stream URL. Cloudinary is smart enough to download from this URL.
        const muxUrl = `https://stream.mux.com/${playbackId}.m3u8`;

        // 1. Upload from Mux URL to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(muxUrl, {
          resource_type: "video",
          folder: "pixelate-uploads", // Optional: Organize your folder
        });

        console.log(`Synced to Cloudinary! Public ID: ${cloudinaryResult.public_id}`);

        // 2. Update DB with BOTH Mux ID (for playback) and Cloudinary ID (for AI)
        await prisma.video.updateMany({
          where: { muxAssetId: assetId },
          data: { 
            status: "ready",
            muxPlaybackId: playbackId,
            duration: duration,
            originalUrl: cloudinaryResult.secure_url, // Or keep Mux URL if preferred
            publicId: cloudinaryResult.public_id      // <--- CRITICAL: Now your AI knows!
          }
        });
        break;
      }

      case 'video.asset.errored': {
        // ... (keep existing error logic)
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}