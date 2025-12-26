"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, FileVideo } from "lucide-react";

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
      if (selectedFile.size > 95 * 1024 * 1024) {
        setError("File size exceeds 95MB limit (Free Tier).");
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

    try {
      // Step A: Get Signature from YOUR Backend
      const signResponse = await axios.post("/api/upload/sign", {
        paramsToSign: {
          folder: "pixelate-videos",
        }
      });
      const { signature, timestamp } = signResponse.data;

      // Step B: Prepare Form Data for Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!); // Public Key
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", "pixelate-videos");

      // Step C: Direct Upload to Cloudinary REST API
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

      console.log("Upload Success:", uploadResponse.data);
      
      // Step D: Redirect to Dashboard (or save to DB)
      // Ideally, you'd send uploadResponse.data.secure_url to your own backend now to save the Video record
      router.push("/dashboard");

    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-3xl font-bold mb-8">Upload Video</h1>

      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-xl">
        
        {/* File Input Area */}
        <div className="relative group cursor-pointer">
          <input
            type="file"
            accept="video/mp4,video/mov,video/avi"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${
            file ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
          }`}>
            {file ? (
              <>
                <FileVideo className="w-12 h-12 text-violet-400 mb-4" />
                <p className="font-medium text-zinc-200">{file.name}</p>
                <p className="text-sm text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-zinc-500 mb-4" />
                <p className="text-zinc-400 font-medium">Click to browse or drag video</p>
                <p className="text-sm text-zinc-600 mt-1">MP4, MOV up to 100MB</p>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

        {/* Upload Button & Progress */}
        {file && (
          <div className="mt-6">
            {uploading ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                {/* Progress Bar Track */}
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  {/* Progress Bar Fill */}
                  <div 
                    className="bg-violet-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Start Upload
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}