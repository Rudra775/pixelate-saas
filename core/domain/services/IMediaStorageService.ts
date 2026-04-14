export interface IMediaStorageService {
  uploadFromUrl(sourceUrl: string, publicId: string, webhookUrl: string): Promise<void>;
}
