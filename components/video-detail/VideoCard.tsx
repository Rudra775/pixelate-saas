import React from "react";
import { Clock, CheckCircle, Loader2 } from "lucide-react";
import { getCldImageUrl } from "next-cloudinary";
import { Video } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const isProcessing = video.status === "processing";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-2xl">
      {/* Thumbnail Area */}
      <div className="aspect-video relative bg-zinc-950">
        {isProcessing ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs font-medium uppercase tracking-wider">Processing</span>
          </div>
        ) : (
          <img
            src={getCldImageUrl({
              src: video.publicId,
              width: 400,
              height: 225,
              crop: "fill",
              assetType: "video", // Important for generating thumbs from video
            })}
            alt={video.originalName}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Clock size={12} />
          {Math.round(video.duration)}s
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold truncate mb-1 text-zinc-100" title={video.originalName}>
          {video.originalName}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-zinc-500">
            {dayjs(video.createdAt).fromNow()}
          </span>
          
          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            isProcessing ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"
          }`}>
            {isProcessing ? <Loader2 size={10} className="animate-spin"/> : <CheckCircle size={10} />}
            {video.status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
