import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; 
import { db as prisma } from '@/lib/prisma'; // Check your import path for prisma

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Create Mux Direct Upload
    const upload = await mux.video.uploads.create({
      cors_origin: '*', 
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: userId, 
      },
    });

    // 2. Create DB Record IMMEDIATELY (Status: uploading)
    const video = await prisma.video.create({
      data: {
        userId,
        title: "Untitled Video (Uploading)",
        status: "uploading",
        originalName: "uploading...", 
        originalUrl: "",             
        duration: 0,
        muxUploadId: upload.id,       // Key for matching webhook later
      }
    });

    return NextResponse.json({ 
      uploadUrl: upload.url, 
      uploadId: upload.id,
      dbId: video.id 
    });
    
  } catch (error) {
    console.error("Mux API Error:", error);
    return NextResponse.json({ error: 'Error creating upload' }, { status: 500 });
  }
}