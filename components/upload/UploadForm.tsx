"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as UpChunk from '@mux/upchunk';

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Get URL from your server
      const response = await fetch('/api/jobs/upload/mux', { method: 'POST' });
      const { uploadUrl, dbId } = await response.json();

      // 2. Start Direct Upload
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: file,
        chunkSize: 5120, // 5MB chunks
      });

      upload.on('progress', (ev) => setProgress(Math.floor(ev.detail)));
      
      upload.on('success', () => {
        // 3. Redirect to processing page immediately
        router.push(`/video/${dbId}`); 
      });

    } catch (err) {
      console.error("Upload failed:", err);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 border-2 border-dashed rounded-xl bg-slate-50 text-center">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden" 
      />
      
      {!isUploading ? (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Select Video File
        </button>
      ) : (
        <div className="w-full">
          <p className="mb-2 font-medium">Uploading... {progress}%</p>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}