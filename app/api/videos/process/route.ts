import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { connection as redisConnection } from "@/lib/redis";

const videoQueue = new Queue("video-processing", { connection: redisConnection });

export async function POST(req: Request) {
  const { uploadId, userId } = await req.json();

  // Add the job to Redis
  await videoQueue.add("process-mux-video", {
    muxUploadId: uploadId,
    userId: userId
  });

  return NextResponse.json({ success: true });
}