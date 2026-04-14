"use client";

// components/video-detail/VideoCard.tsx
import React, { useState } from 'react';
import { Video, ProcessedFrame } from '@prisma/client';
import { Clock, CheckCircle, AlertCircle, Trash2, Edit2, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// Define the type to include the relation we fetched
type VideoWithFrame = Video & {
  frames?: ProcessedFrame[];
};

interface VideoCardProps {
  video: VideoWithFrame;
}

export default function VideoCard({ video }: VideoCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(video.originalName || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // LOGIC: Get the best possible image URL
  // 1. Try to use the AI-selected frame (best quality)
  // 2. Fallback to generating a thumbnail from the video itself
  const rawThumbnailUrl = video.frames?.[0]?.imageUrl || video.originalUrl;

  // LOGIC: Force Cloudinary to give us a small, compressed thumbnail
  const thumbnailUrl = rawThumbnailUrl
    ? rawThumbnailUrl
        .replace('/upload/', '/upload/w_400,h_225,c_fill,q_auto,f_jpg/') // Resize + Force JPG
        .replace('.mp4', '.jpg') // Safety check if using originalUrl
    : '/placeholder.png';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this video?")) {
      setIsDeleting(true);
      try {
        await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
        router.refresh();
      } catch (error) {
        console.error("Failed to delete video", error);
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
    setEditedName(video.originalName || "");
  };

  const handleSaveEdit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editedName.trim()) return;

    setIsSaving(true);
    try {
      await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editedName }),
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update video name", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 transition-colors relative flex flex-col h-full ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Actions Layer */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleEdit}
          className="p-1.5 bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white rounded-md transition-colors backdrop-blur-sm"
          title="Edit Name"
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-1.5 bg-black/60 hover:bg-red-500/90 text-zinc-300 hover:text-white rounded-md transition-colors backdrop-blur-sm"
          title="Delete Video"
        >
          <Trash2 size={16} />
        </button>
      </div>

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
        {isEditing ? (
          <div className="flex items-center gap-2 mb-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <input 
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-violet-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(e);
                if (e.key === 'Escape') handleCancelEdit(e as any);
              }}
            />
            <button onClick={handleSaveEdit} disabled={isSaving} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
              <Check size={16} />
            </button>
            <button onClick={handleCancelEdit} disabled={isSaving} className="p-1 text-zinc-400 hover:bg-zinc-800 rounded">
              <X size={16} />
            </button>
          </div>
        ) : (
          <h3 className="font-semibold truncate mb-2" title={video.originalName}>
            {video.originalName || "Untitled Video"}
          </h3>
        )}
        
        <div className="flex items-center gap-2 text-sm text-zinc-400">
           {video.status === 'completed' && <><CheckCircle size={14} className="text-green-500"/> Completed</>}
           {video.status === 'processing' && <><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"/> Processing</>}
           {video.status === 'failed' && <><AlertCircle size={14} className="text-red-500"/> Failed</>}
        </div>
      </div>
    </motion.div>
  );
}