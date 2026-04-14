import { IVideoRepository } from "@/core/domain/repositories/IVideoRepository";
import { IMediaStorageService } from "@/core/domain/services/IMediaStorageService";

// It's a best practice to define the inputs as an interface or DTO (Data Transfer Object)
export interface HandleVideoAssetReadyDTO {
  uploadId: string;
  playbackId: string;
  duration: number;
  appUrl: string; // Injecting this keeps `process.env` out of our core domain logic
}

export class HandleVideoAssetReadyUseCase {
  constructor(
    private readonly videoRepository: IVideoRepository,
    private readonly mediaStorageService: IMediaStorageService
  ) {}

  async execute(data: HandleVideoAssetReadyDTO): Promise<void> {
    const { uploadId, playbackId, duration, appUrl } = data;

    if (!uploadId) {
      throw new Error("Missing uploadId");
    }

    if (!playbackId) {
      throw new Error("Missing playbackId");
    }

    // 1. Mark video as 'ready' in the database
    await this.videoRepository.markAsReady(uploadId, playbackId, duration);

    // 2. Schedule Cloudinary handoff
    // Notice we do NOT `await` this, mimicking the original behavior of "fire and forget".
    // This allows the webhook response to be sent to Mux as quickly as possible.
    const muxUrl = `https://stream.mux.com/${playbackId}/high.mp4`;
    const cloudinaryPublicId = `pixelate-videos/${playbackId}`;
    const cloudinaryWebhookUrl = `${appUrl}/api/webhooks/cloudinary`;

    this.mediaStorageService.uploadFromUrl(
      muxUrl,
      cloudinaryPublicId,
      cloudinaryWebhookUrl
    );
  }
}
