"use client";
import { getCldImageUrl } from "next-cloudinary";
import { Download, Image as ImageIcon, Youtube, Linkedin, Twitter } from "lucide-react";

export default function ThumbnailGen({ publicId }: { publicId: string }) {
  
  // 1. Define the Static Image Formats you want
  const formats = [
    { 
      label: "YouTube Thumbnail", 
      width: 1280, height: 720, 
      icon: <Youtube size={18} /> 
    },
    { 
      label: "Instagram Square", 
      width: 1080, height: 1080, 
      icon: <ImageIcon size={18} /> 
    },
    { 
      label: "LinkedIn Cover", 
      width: 1200, height: 627, 
      icon: <Linkedin size={18} /> 
    },
    { 
        label: "Twitter Header", 
        width: 1500, height: 500, 
        icon: <Twitter size={18} /> 
    }
  ];

  const handleDownload = (width: number, height: number) => {
    const url = getCldImageUrl({
      src: publicId,
      width,
      height,
      crop: "fill",
      gravity: "auto", // 🧠 AI finds the face/subject
      format: "jpg",
      assetType: "video" // Extract image FROM the video source
    });
    // Open in new tab to save
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {formats.map((fmt) => (
        <div key={fmt.label} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all flex flex-col">
          
          {/* Header */}
          <div className="p-3 flex items-center gap-2 text-zinc-400 text-sm font-medium border-b border-zinc-800 bg-zinc-950/50">
             {fmt.icon} {fmt.label}
          </div>

          {/* Preview Area */}
          <div className="aspect-video bg-black relative overflow-hidden">
             <img 
               className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-105 duration-500"
               src={getCldImageUrl({
                 src: publicId,
                 width: fmt.width,
                 height: fmt.height,
                 crop: "fill",
                 gravity: "auto",
                 assetType: "video"
               })}
               alt={fmt.label}
             />
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900">
            <button 
              onClick={() => handleDownload(fmt.width, fmt.height)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-violet-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} /> Download Image
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}