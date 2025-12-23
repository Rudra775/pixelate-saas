"use client";

import React, { useState, useEffect } from "react";
import VideoCard from "@/components/video-detail/VideoCard";
import { Video } from "@/types";

export default function HomeClient({ initialVideos }: { initialVideos: Video[] }) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const cached = localStorage.getItem("videos-cache");
    if (cached) setVideos(JSON.parse(cached));

    const refreshVideos = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/videos", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (Array.isArray(data)) {
          setVideos(data);
          localStorage.setItem("videos-cache", JSON.stringify(data));
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch videos");
      } finally {
        setLoading(false);
      }
    };

    refreshVideos();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Videos</h1>

      {error && <p className="text-red-500">{error}</p>}
      {loading && (
        <div className="text-center text-gray-400 text-sm mb-2">
          Refreshing latest uploads...
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center text-lg text-gray-500">No videos available</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
