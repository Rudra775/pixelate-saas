// app/api/jobs/upload/mux/route.ts
import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; // Assuming you use Clerk based on your schema

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Create a direct upload URL
    const upload = await mux.video.uploads.create({
      cors_origin: '*', // In production, set this to your actual domain
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: userId, // Pass userId to webhook later
      },
    });

    return NextResponse.json({ 
      uploadUrl: upload.url, 
      uploadId: upload.id 
    });
    
  } catch (error) {
    console.error("Mux API Error:", error);
    return NextResponse.json(
      { error: 'Error creating upload URL' }, 
      { status: 500 }
    );
  }
}