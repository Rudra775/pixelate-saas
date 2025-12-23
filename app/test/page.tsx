"use client";

import { useState } from "react";

export default function TestPage() {
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const addLog = (msg: string) =>
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus("uploading");
      addLog("🚀 Starting Process...");

      // 1. Get Signature AND API Key
      addLog("🔑 Fetching Signature...");
      const signRes = await fetch("/api/videos/upload-sign", {
        method: "POST",
      });
      
      // 👇 Destructure apiKey from the response
      const { signature, timestamp, apiKey } = await signRes.json();

      if (!apiKey) throw new Error("Could not retrieve API Key from server");

      // 2. Upload to Cloudinary (Client-Side)
      addLog("☁️ Uploading to Cloudinary...");
      const formData = new FormData();
      formData.append("file", file);
      
      // 👇 Use the apiKey from the server response
      formData.append("api_key", apiKey); 
      
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", "pixelate-uploads");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok)
        throw new Error(uploadData.error?.message || "Upload Failed");
      addLog(`Uploaded! ID: ${uploadData.public_id}`);

      // 3. Trigger Backend Processing
      addLog("⚡ Triggering Worker...");
      const processRes = await fetch("/api/videos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: uploadData.public_id,
          originalUrl: uploadData.secure_url,
          originalName: file.name,
          duration: uploadData.duration,
          size: uploadData.bytes,
        }),
      });
      const processData = await processRes.json();
      if (!processData.success) throw new Error(processData.error);

      const videoId = processData.videoId;
      addLog(`⚙️ Job Queued! Video ID: ${videoId}`);

      // 4. Poll for Completion
      setStatus("processing");
      const interval = setInterval(async () => {
        addLog("🔄 Polling status...");
        const pollRes = await fetch(`/api/videos/${videoId}`); // You need to implement GET [id] logic or check DB
        // For now, let's just assume we check DB manually or console
        // To make this page work perfectly, ensure GET /api/videos/[id] returns the video object
      }, 5000);
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      setStatus("error");
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto font-mono text-sm">
      <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>

      <div className="border-2 border-dashed border-gray-300 p-10 text-center rounded-lg">
        <input type="file" onChange={handleUpload} accept="video/*" />
      </div>

      <div className="mt-8 bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
