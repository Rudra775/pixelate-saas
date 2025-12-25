// components/video-detail/VideoCard.tsx
import React from 'react';
import { Video, ProcessedFrame } from '@prisma/client';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

// Define the type to include the relation we fetched
type VideoWithFrame = Video & {
  frames?: ProcessedFrame[];
};

interface VideoCardProps {
  video: VideoWithFrame;
}

export default function VideoCard({ video }: VideoCardProps) {
  
  // LOGIC: Get the best possible image URL
  // 1. Try to use the AI-selected frame (best quality)
  // 2. Fallback to generating a thumbnail from the video itself
  const rawThumbnailUrl = video.frames?.[0]?.imageUrl || video.originalUrl;

  // LOGIC: Force Cloudinary to give us a small, compressed thumbnail
  // This prevents the "13MB bomb"
  const thumbnailUrl = rawThumbnailUrl
    ? rawThumbnailUrl
        .replace('/upload/', '/upload/w_400,h_225,c_fill,q_auto,f_jpg/') // Resize + Force JPG
        .replace('.mp4', '.jpg') // Safety check if using originalUrl
    : '/placeholder.png';

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all">
      {/* Thumbnail Area */}
      <div className="aspect-video relative bg-zinc-950">
        <img 
          src={thumbnailUrl} 
          alt={video.originalName || "Video thumbnail"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono">
          {Math.round(video.duration || 0)}s
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4">
        <h3 className="font-semibold truncate mb-2" title={video.originalName}>
          {video.originalName || "Untitled Video"}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-zinc-400">
           {video.status === 'completed' && <><CheckCircle size={14} className="text-green-500"/> Completed</>}
           {video.status === 'processing' && <><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"/> Processing</>}
           {video.status === 'failed' && <><AlertCircle size={14} className="text-red-500"/> Failed</>}
        </div>
      </div>
    </div>
  );
}