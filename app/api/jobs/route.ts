export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { Queue } from 'bullmq';
import { redisConfig } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import fs from 'fs';
import path from 'path';
import os from 'os';

// 1. Singleton Pattern for BullMQ in Next.js Dev
// This prevents creating 100s of connections every time you save a file.
const globalQueue = global as unknown as { videoQueue: Queue };

let videoQueue: Queue;
if (!globalQueue.videoQueue) {
  globalQueue.videoQueue = new Queue('video-processing', { connection: redisConfig });
}
videoQueue = globalQueue.videoQueue;

export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 });
    }

    // 2. Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Save to a local temp directory safely
    // Using os.tmpdir() is safer than process.cwd() for cross-platform compatibility
    const tempDir = os.tmpdir();
    const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = path.join(tempDir, uniqueName);

    // Write file locally
    await fs.promises.writeFile(filePath, buffer);

    // 4. Add to BullMQ
    const job = await videoQueue.add('process-video', { 
      filePath,  // Worker will read from this path
      userId,
      originalName: file.name
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });

    return NextResponse.json({ jobId: job.id, success: true });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}