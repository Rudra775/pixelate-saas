"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to upload");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('video/')) {
      alert("Please select a video file.");
      return;
    }
    // Example 100MB limit check (optional for UI)
    if (file.size > 100 * 1024 * 1024) {
      alert("File is too large (Max 100MB for demo).");
      return;
    }

    uploadFileToList(file);
  };

  const uploadFileToList = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setStatusText("Initializing upload...");

    try {
      // 1. Get secure signature from our backend
      const sigRes = await fetch('/api/upload/signature', { method: 'POST' });
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, apiKey, folder, cloudName } = await sigRes.json();

      // 2. Prepare form data for Cloudinary direct upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', 'video'); // Explicitly set resource type

      setStatusText("Uploading to cloud...");

      // 3. Use XHR for upload progress tracking
      const xhr = new XMLHttpRequest();
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

      xhr.open('POST', cloudinaryUrl);

      // Track upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      };

      // Handle upload completion
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          console.log("✅ Cloudinary Upload Complete:", result.public_id);
          
          setStatusText("Finalizing & queueing job...");
          setProgress(100);

          // 4. Tell our backend to start processing (add to Redis queue)
          const processRes = await fetch('/api/upload/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              publicId: result.public_id,
              secureUrl: result.secure_url,
              originalName: file.name,
              duration: result.duration || 0, // Cloudinary provides duration instantly!
            }),
          });

          if (processRes.ok) {
             const { videoId } = await processRes.json();
             // Redirect to the video page which should show a "Processing" state
             router.push(`/videos/${videoId}`);
          } else {
             throw new Error("Failed to kick off processing job.");
          }

        } else {
           console.error("Cloudinary error:", xhr.responseText);
           throw new Error(`Upload failed: ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => {
        throw new Error("Network error during upload.");
      };

      xhr.send(formData);

    } catch (err: any) {
      console.error("Upload workflow failed:", err);
      setStatusText(`Error: ${err.message}`);
      setIsUploading(false);
      // In a real app, show a toast notification here
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 border border-zinc-800 rounded-xl bg-zinc-950 text-center shadow-2xl shadow-zinc-900/50">
      <input 
        type="file" 
        accept="video/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden" 
      />
      
      <div className="space-y-6">
        <div className="space-y-2">
            <h3 className="text-lg font-medium text-zinc-100">Upload Video</h3>
            <p className="text-sm text-zinc-400">
                MP4, MOV, or WebM up to 100MB.
            </p>
        </div>

        {!isUploading ? (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg p-12 cursor-pointer transition-colors duration-200"
            >
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="p-4 rounded-full bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-400 group-hover:text-zinc-200">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <button 
                    className="px-6 py-2.5 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-colors"
                    >
                    Select File
                    </button>
                 </div>
            </div>
        ) : (
            <div className="w-full py-8 space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-400 font-medium">{statusText}</span>
                <span className="text-zinc-100 font-bold">{progress}%</span>
            </div>
            {/* Progress Bar Track */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                {/* Progress Bar Fill */}
                <div 
                className="h-full bg-zinc-100 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
                />
            </div>
            </div>
        )}
      </div>
    </div>
  );
}