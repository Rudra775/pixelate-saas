"use client";
import { useState } from "react";
import SmartCropper from "./SmartCropper";
import ThumbnailGen from "./ThumbnailGen"; // The new file above
import { Video, Image as ImageIcon } from "lucide-react";

export default function MediaGallery({ publicId }: { publicId: string }) {
  const [activeTab, setActiveTab] = useState<"video" | "image">("video");

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500"/>
          Generated Assets
        </h2>
        
        {/* Toggle Switch */}
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab("video")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === "video" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Video size={14} /> Video Clips
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === "image" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon size={14} /> Thumbnails
          </button>
        </div>
      </div>

      {activeTab === "video" ? (
        <SmartCropper publicId={publicId} />
      ) : (
        <ThumbnailGen publicId={publicId} />
      )}
    </div>
  );
}