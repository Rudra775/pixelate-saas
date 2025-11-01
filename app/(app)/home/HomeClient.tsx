"use client";

import React, { useState, useEffect } from "react";
import VideoCard from "@/components/VideoCard";
import { Video } from "@/types";

export default function HomeClient({ initialVideos }: { initialVideos: Video[] }) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional background refresh after mount
  useEffect(() => {
    const refreshVideos = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/videos", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data)) setVideos(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch videos");
      } finally {
        setLoading(false);
      }
    };
    refreshVideos();
  }, []);

  if (loading) return <div>Loading latest videos…</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Videos</h1>
      {videos.length === 0 ? (
        <div className="text-center text-lg text-gray-500">No videos available</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

