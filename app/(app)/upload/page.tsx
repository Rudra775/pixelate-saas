"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, FileVideo, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // 1. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB Limit
        setError("File size exceeds 100MB limit.");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  // 2. The Upload Logic
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");

    try {
      // --- Step A: Get Signature from YOUR Backend ---
      const signResponse = await axios.post("/api/upload/sign", {
        paramsToSign: { folder: "pixelate-videos" }
      });
      
      const { signature, timestamp, apiKey } = signResponse.data;

      // --- Step B: Upload to Cloudinary ---
      const formData = new FormData();
      formData.append("file", file);
      // Use the key from the server response, fallback to env if needed
      formData.append("api_key", apiKey || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!); 
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", "pixelate-videos");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

      const uploadResponse = await axios.post(url, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });

      console.log("✅ Cloudinary Upload Success:", uploadResponse.data);

      // --- Step C: Trigger Backend Processing (THE MISSING LINK) ---
      // This saves the video to DB and starts the Worker
      await axios.post("/api/videos", {
        publicId: uploadResponse.data.public_id,
        originalUrl: uploadResponse.data.secure_url,
        duration: uploadResponse.data.duration,
        originalName: file.name
      });

      console.log("✅ Backend Sync Success");
      
      // --- Step D: Redirect to Dashboard ---
      router.push("/dashboard");

    } catch (err: any) {
      console.error("Upload failed:", err);
      // Show a better error message if available
      const errMsg = err.response?.data?.error || err.message || "Upload failed";
      setError(`Upload failed: ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Upload Video</h1>
        <p className="text-zinc-400">Upload raw footage to begin the AI repurposing pipeline.</p>
      </div>

      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Dropzone / Input */}
        <div className="relative group cursor-pointer">
          <input
            type="file"
            accept="video/mp4,video/mov,video/avi,video/webm"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all duration-200 ${
            file 
              ? "border-violet-500 bg-violet-500/10" 
              : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
          } ${uploading ? "opacity-50" : ""}`}>
            
            {file ? (
              <>
                <FileVideo className="w-16 h-16 text-violet-400 mb-4 animate-in zoom-in duration-300" />
                <p className="font-semibold text-lg text-zinc-200 truncate max-w-xs">{file.name}</p>
                <p className="text-sm text-zinc-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-16 h-16 text-zinc-500 mb-4 group-hover:text-zinc-300 transition-colors" />
                <p className="text-zinc-300 font-medium text-lg">Click to browse or drag video</p>
                <p className="text-sm text-zinc-600 mt-2">MP4, MOV, WEBM up to 100MB</p>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Area */}
        {file && (
          <div className="mt-8 animate-in slide-in-from-bottom-2">
            {uploading ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-zinc-400 font-medium">
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-violet-500" size={16}/> 
                    Uploading & Processing...
                  </span>
                  <span>{progress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden border border-zinc-700">
                  <div 
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                <UploadCloud size={20} />
                Start Upload
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}