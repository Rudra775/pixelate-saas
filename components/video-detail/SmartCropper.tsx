"use client";
import { getCldVideoUrl } from "next-cloudinary";
import { Download, Smartphone, Monitor, Square } from "lucide-react";

export default function SmartCropper({ publicId }: { publicId: string }) {
  
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
      gravity: "auto", // AI Subject Tracking
      rawTransformations: ["fl_attachment"] // Forces browser to download
    });
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {formats.map((fmt) => (
        <div key={fmt.ratio} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all flex flex-col">
          
          {/* Header */}
          <div className="p-3 flex items-center gap-2 text-zinc-400 text-sm font-medium border-b border-zinc-800 bg-zinc-950/50 group-hover:text-violet-400 transition-colors">
             {fmt.icon} {fmt.label}
          </div>

          {/* Preview Area */}
          <div className="aspect-video bg-black relative flex-1">
             <video 
               className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
               src={getCldVideoUrl({
                 src: publicId,
                 aspectRatio: fmt.ratio,
                 crop: "fill",
                 gravity: "auto"
               })}
               muted
               loop
               onMouseOver={e => e.currentTarget.play()}
               onMouseOut={e => e.currentTarget.pause()}
             />
          </div>

          {/* Action Footer */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900">
            <button 
              onClick={() => handleDownload(fmt.ratio)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-95"
            >
              <Download size={16} /> Download Crop
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}