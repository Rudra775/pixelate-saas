import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function POST(req: Request) {
  const { uploadId, userId } = await req.json();

  // Send the job to Inngest instead of Redis/BullMQ
  await inngest.send({
    name: "video/process.mux",
    data: {
      muxUploadId: uploadId,
      userId: userId
    }
  });

  return NextResponse.json({ success: true });
}