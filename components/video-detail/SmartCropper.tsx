"use client";
import { getCldVideoUrl } from "next-cloudinary";
import { Download, Smartphone, Monitor, Square, Loader2 } from "lucide-react";
import { useState } from "react";

export default function SmartCropper({ publicId }: { publicId: string }) {
  // Track processing state for EACH aspect ratio
  const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({});

  const formats = [
    { label: "Portrait (9:16)", ratio: "9:16", icon: <Smartphone size={18} /> },
    { label: "Square (1:1)", ratio: "1:1", icon: <Square size={18} /> },
    { label: "Landscape (16:9)", ratio: "16:9", icon: <Monitor size={18} /> }
  ];

  const handleDownload = (aspectRatio: string) => {
    const url = getCldVideoUrl({
      src: publicId,
      aspectRatio: aspectRatio,
      crop: "fill",
      gravity: "auto",
      rawTransformations: ["fl_attachment"]
    });
    window.open(url, "_blank");
  };

  const handleVideoError = (ratio: string) => {
    // If Cloudinary sends 423 (Locked), switch to Loading State
    setProcessingStates(prev => ({ ...prev, [ratio]: true }));
  };

  const handleHoverPlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.readyState >= 2) {
      video.play().catch(() => {}); // Safely play on hover
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {formats.map((fmt) => {
        const isProcessing = processingStates[fmt.ratio];

        return (
          <div key={fmt.ratio} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all flex flex-col">
            
            <div className="p-3 flex items-center gap-2 text-zinc-400 text-sm font-medium border-b border-zinc-800 bg-zinc-950/50 group-hover:text-violet-400 transition-colors">
               {fmt.icon} {fmt.label}
            </div>

            <div className="aspect-video bg-black relative flex-1 overflow-hidden">
               {isProcessing ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 text-zinc-500 p-4 text-center">
                   <Loader2 className="w-8 h-8 mb-2 animate-spin text-violet-500" />
                   <p className="text-xs font-semibold text-zinc-300">AI Analyzing Subject...</p>
                   <p className="text-[10px] mt-1 text-zinc-500">Video is processing (Error 423)</p>
                 </div>
               ) : (
                 <video 
                   className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                   src={getCldVideoUrl({
                     src: publicId,
                     aspectRatio: fmt.ratio,
                     crop: "fill",
                     gravity: "auto"
                   })}
                   muted
                   loop
                   playsInline
                   // 1. No autoPlay (Fixes the crash)
                   onMouseOver={handleHoverPlay} 
                   onMouseOut={e => e.currentTarget.pause()}
                   // 2. Catch the 423 Error
                   onError={() => handleVideoError(fmt.ratio)}
                 />
               )}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-900">
              <button 
                onClick={() => handleDownload(fmt.ratio)}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isProcessing 
                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                    : "bg-zinc-800 hover:bg-violet-600 text-white active:scale-95"
                }`}
              >
                <Download size={16} /> {isProcessing ? "Wait..." : "Download"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}