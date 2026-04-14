import { v2 as cloudinary } from "cloudinary";
import { IMediaStorageService } from "@/core/domain/services/IMediaStorageService";

// It is good practice to initialize SDKs in the infrastructure layer
// rather than in the application or framework layers.
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryMediaService implements IMediaStorageService {
  async uploadFromUrl(sourceUrl: string, publicId: string, webhookUrl: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.upload(sourceUrl, {
        resource_type: "video",
        public_id: publicId,
        notification_url: webhookUrl,
      });
      console.log("Cloudinary Upload Success:", result.public_id);
    } catch (err) {
      // In a production Clean Architecture, we would throw a custom Domain Error here
      // and let an error handler or use-case catch it. 
      // For now, we mimic the original 'fire and forget' logging.
      console.error("Cloudinary Handoff Failed:", err);
    }
  }
}
