"use client";
import { getCldVideoUrl } from "next-cloudinary";

export default function VideoPlayer({ publicId }: { publicId: string }) {
  return (
    <div className="aspect-video bg-black relative">
      <video
        className="w-full h-full object-contain"
        src={getCldVideoUrl({ src: publicId })}
        controls
        controlsList="nodownload"
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}