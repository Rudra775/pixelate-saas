export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Queue, Job } from 'bullmq';
import { redisConfig } from '@/lib/redis';

const videoQueue = new Queue('video-processing', { connection: redisConfig });

// Update the type definition to wrap params in Promise
export async function GET(
  _: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params object before using it
  const { id } = await params;

  const job = await Job.fromId(videoQueue, id);
  
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state = await job.getState();
  const result = job.returnvalue ?? null;
  const attemptsMade = job.attemptsMade ?? 0;
  const failedReason = job.failedReason ?? null;

  return NextResponse.json({ state, result, attemptsMade, failedReason });
}