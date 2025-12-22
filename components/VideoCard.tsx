import React, { useState, useCallback, useEffect } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileVideo } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Video } from "@prisma/client"; // Import directly from Prisma

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const getThumbnailUrl = useCallback((publicId: string) => {
    return getCldImageUrl({
      src: publicId,
      width: 400,
      height: 225,
      crop: "fill",
      gravity: "auto",
      format: "jpg",
      quality: "auto",
      assetType: "video",
    });
  }, []);

  const getFullVideoUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 1920,
      height: 1080,
    });
  }, []);

  const getPreviewVideoUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 400,
      height: 225,
      rawTransformations: ["e_preview:duration_15:max_seg_9:min_seg_dur_1"],
    });
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    setPreviewError(false);
  }, [isHovered]);

  return (
    <div
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <figure className="aspect-video relative">
        {isHovered ? (
          previewError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <p className="text-red-500 text-xs">Preview unavailable</p>
            </div>
          ) : (
            <video
              src={getPreviewVideoUrl(video.publicId)}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          )
        ) : (
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.originalName}
            className="w-full h-full object-cover"
          />
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
          <Clock size={12} className="mr-1" />
          {formatDuration(video.duration)}
        </div>
      </figure>

      <div className="card-body p-4">
        {/* Title / Name */}
        <h2
          className="card-title text-base font-bold truncate block"
          title={video.originalName}
        >
          {video.originalName}
        </h2>

        {/* Upload Date */}
        <p className="text-xs text-base-content/70">
          Uploaded {dayjs(video.createdAt).fromNow()}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="badge badge-outline text-xs">{video.status}</div>

          <button
            className="btn btn-primary btn-sm btn-circle"
            onClick={() =>
              onDownload(getFullVideoUrl(video.publicId), video.originalName)
            }
            title="Download Video"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
