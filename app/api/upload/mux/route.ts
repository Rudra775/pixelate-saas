import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 🔒 SECURITY FIX: Load keys from .env
    const MUX_ID = process.env.MUX_TOKEN_ID;
    const MUX_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_ID || !MUX_SECRET) {
      console.error("❌ Mux Keys Missing in .env");
      return new NextResponse("Server Configuration Error", { status: 500 });
    }
    
    // Create Basic Auth Header
    const basicAuth = Buffer.from(`${MUX_ID}:${MUX_SECRET}`).toString('base64');

    // Direct API Call (Bulletproof)
    const response = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          playback_policy: ["public"],
          passthrough: userId,
        }
      })
    });

    const muxData = await response.json();

    if (!response.ok) {
      console.error("Mux Failed:", muxData);
      return NextResponse.json(muxData, { status: response.status });
    }

    const upload = muxData.data;

    // Create DB Record
    const video = await prisma.video.create({
      data: {
        userId,
        title: "Untitled Video (Uploading)",
        status: "uploading",
        originalName: "uploading...",
        originalUrl: "",
        duration: 0,
        muxUploadId: upload.id,
      }
    });

    return NextResponse.json({ 
      uploadUrl: upload.url, 
      uploadId: upload.id,
      dbId: video.id 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}