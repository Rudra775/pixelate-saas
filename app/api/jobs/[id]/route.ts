export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Queue, Job } from 'bullmq';
import { redisConfig } from '@/lib/redis';

const videoQueue = new Queue('video-processing', { connection: redisConfig });

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await Job.fromId(videoQueue, params.id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const state = await job.getState();
  const result = job.returnvalue ?? null;

  return NextResponse.json({ state, result });
}
