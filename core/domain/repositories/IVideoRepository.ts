export interface IVideoRepository {
  markAsReady(uploadId: string, playbackId: string, duration: number): Promise<void>;
}
