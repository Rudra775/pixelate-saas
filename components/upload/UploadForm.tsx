"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as UpChunk from '@mux/upchunk';
import { CloudUpload, FileVideo, AlertCircle, CheckCircle2 } from 'lucide-react'; // Standard icons, or replace with SVGs

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus("uploading");
    setErrorMessage("");

    try {
      // 1. Get Upload URL & DB Record ID from your Backend
      const response = await fetch('/api/jobs/upload/mux', { method: 'POST' });
      
      if (!response.ok) throw new Error("Failed to initialize upload");
      
      const { uploadUrl, dbId } = await response.json();

      // 2. Start Direct Upload to Mux (Bypassing your server for performance)
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: file,
        chunkSize: 5120, // 5MB chunks
      });

      // 3. Event Listeners
      upload.on('progress', (progressEvent) => {
        // Mux sometimes sends >100 rarely, cap it at 100
        setProgress(Math.min(Math.floor(progressEvent.detail), 100));
      });

      upload.on('success', () => {
        setStatus("success");
        console.log("Upload to Mux complete. Redirecting to:", dbId);
        
        // 4. Redirect immediately to the processing page
        // The Webhook will handle the rest in the background.
        router.push(`/video/${dbId}`); 
      });

      upload.on('error', (err) => {
        setStatus("error");
        setErrorMessage("Connection failed. Please check your internet and try again.");
        console.error("Upload error:", err);
      });

    } catch (err) {
      console.error("Setup failed:", err);
      setStatus("error");
      setErrorMessage("Could not start upload session.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      
      {/* Hidden Native Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="video/*"
        className="hidden" 
      />

      {/* DROPZONE UI */}
      <div 
        className={`
          relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 text-center
          ${status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-500 bg-slate-50'}
        `}
      >
        
        {/* STATE: IDLE */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <CloudUpload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload your video</h3>
              <p className="text-gray-500 text-sm mt-1">MP4, MOV, or WEBM (Max 2GB)</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition shadow-sm"
            >
              Select File
            </button>
          </div>
        )}

        {/* STATE: UPLOADING */}
        {status === "uploading" && (
          <div className="flex flex-col items-center w-full max-w-sm mx-auto">
            <div className="w-full flex justify-between text-xs font-semibold uppercase text-gray-500 mb-2">
              <span>Uploading to Cloud</span>
              <span>{progress}%</span>
            </div>
            
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-gray-500 animate-pulse">
              Please do not close this tab...
            </p>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {status === "success" && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
            <div className="text-green-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Upload Complete!</h3>
            <p className="text-gray-500 text-sm">Redirecting to editor...</p>
          </div>
        )}

        {/* STATE: ERROR */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Upload Failed</h3>
            <p className="text-red-600 text-sm max-w-xs">{errorMessage}</p>
            <button 
              onClick={() => {
                setStatus("idle");
                setIsUploading(false);
              }}
              className="mt-4 text-sm text-gray-600 underline hover:text-gray-900"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}