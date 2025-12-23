"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import VideoCard from "@/components/video-detail/VideoCard"; // We will fix this component below
import { Video } from "@prisma/client";

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Failed to fetch videos", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link 
          href="/upload" 
          className="bg-white text-zinc-950 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Upload New Video
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-violet-500" size={32} />
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500">No videos processed yet.</p>
          <Link href="/upload" className="text-violet-400 hover:underline mt-2 inline-block">
            Start your first upload
          </Link>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Link key={video.id} href={`/videos/${video.id}`} className="group">
             <VideoCard video={video} onDownload={() => {}} />
          </Link>
        ))}
      </div>
    </div>
  );
}