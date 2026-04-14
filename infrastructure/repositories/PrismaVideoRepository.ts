import { db as prisma } from "@/lib/prisma";
import { IVideoRepository } from "@/core/domain/repositories/IVideoRepository";

export class PrismaVideoRepository implements IVideoRepository {
  async markAsReady(uploadId: string, playbackId: string, duration: number): Promise<void> {
    await prisma.video.updateMany({
      where: { muxUploadId: uploadId },
      data: {
        status: "ready",
        muxPlaybackId: playbackId,
        duration: duration,
      },
    });
  }
}
