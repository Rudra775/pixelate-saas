export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import {Queue, tryCatch} from 'bullmq';
import { redisConfig } from "@/lib/redis";
import fs from 'fs';
import path from 'path';

const videoQueue = new Queue('video-processing', {connection: redisConfig});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (err) {
      console.error("Failed to read file:", err);
      return NextResponse.json({ error: 'File read error' }, { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const filePath = path.join(tmpDir, `${Date.now()}-${file.name}`);
    fs.writeFileSync(filePath, buffer);

    // enqueue BullMQ job
    try {
      const job = await videoQueue.add('process-video', { filePath }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      return NextResponse.json({ jobId: job.id });
    } catch (err) {
      console.error('BullMQ enqueue error:', err);
      return NextResponse.json({ error: 'Failed to enqueue job' }, { status: 500 });
    }

  } catch (e) {
    console.error('POST /api/jobs unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected failure' }, { status: 500 });
  }
}
