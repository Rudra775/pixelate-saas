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
        if(!file) return NextResponse.json({error: 'No file'}, {status: 400});

        const buffer = Buffer.from(await file.arrayBuffer());

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

        const filePath = path.join(tmpDir, `${Date.now()} - ${file.name}`);
        fs.writeFileSync(filePath, buffer);

        const job = await videoQueue.add('process-video', {filePath});
        return NextResponse.json({jobId: job.id});

    } catch(e) {
        console.error("enqueue error", e);
        return NextResponse.json({error: 'Failed to enqueue'}, {status: 500});
    }
}