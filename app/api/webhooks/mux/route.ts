import { NextResponse } from 'next/server';
import Webhooks from '@mux/mux-node';
import { PrismaVideoRepository } from '@/infrastructure/repositories/PrismaVideoRepository';
import { CloudinaryMediaService } from '@/infrastructure/services/CloudinaryMediaService';
import { HandleVideoAssetReadyUseCase } from '@/core/application/use-cases/HandleVideoAssetReadyUseCase';

// Initialize Secrets
const webhookSecret = process.env.MUX_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    // 1. Grab body and signature (Framework Concerns)
    const body = await req.text();
    const headers = req.headers;
    const signature = headers.get('mux-signature');

    if (!signature || !webhookSecret) {
      console.error("Missing Signature or Secret");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Verify the Signature (Security Concern)
    try {
      (Webhooks as any).verify(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook Signature Verification Failed");
      return new NextResponse("Invalid Signature", { status: 401 });
    }

    // 3. Parse Event
    const event = JSON.parse(body);
    const { type, data } = event;

    // 4. Delegate to Use Case (Business Logic)
    if (type === 'video.asset.ready') {
      const playbackId = data.playback_ids?.[0]?.id;
      const uploadId = data.upload_id; 

      if (!uploadId) return new NextResponse("No Upload ID", { status: 200 });
      if (!playbackId) return new NextResponse("No Playback ID", { status: 200 });

      // Dependency Injection (Manually instantiating our dependencies)
      // In a more complex app, you could use a container like tsyringe or awilix here.
      const videoRepository = new PrismaVideoRepository();
      const mediaStorageService = new CloudinaryMediaService();
      
      const handleVideoReadyUseCase = new HandleVideoAssetReadyUseCase(
        videoRepository,
        mediaStorageService
      );

      // Execute application pure logic
      try {
        await handleVideoReadyUseCase.execute({
          uploadId,
          playbackId,
          duration: data.duration,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        });
      } catch (err) {
        console.error("Use Case Failed:", err);
      }
    }

    return new NextResponse("Webhook Received", { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}