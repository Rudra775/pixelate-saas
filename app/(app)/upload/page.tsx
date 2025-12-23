"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      // 1. Get Signature
      const signRes = await fetch("/api/upload/sign", { method: "POST" });
      const { signature, timestamp, apiKey, folder } = await signRes.json();

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: formData }
      );
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Upload Failed");

      // 3. Trigger Backend Processing
      const processRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: uploadData.public_id,
          originalUrl: uploadData.secure_url,
          originalName: file.name,
          duration: uploadData.duration,
        }),
      });

      if (processRes.ok) {
        // Redirect to Dashboard on success
        router.push("/dashboard");
      } else {
        throw new Error("Failed to start processing");
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Upload Video</h1>
        <p className="text-zinc-400">Upload raw footage to begin the AI repurposing pipeline.</p>
      </div>

      <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center hover:border-violet-500/50 transition-colors bg-zinc-900/50 relative">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="animate-spin text-violet-500" size={32} />
            ) : (
              <UploadCloud className="text-zinc-400" size={32} />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">
              {isUploading ? "Uploading & Processing..." : "Click to Upload Video"}
            </h3>
            <p className="text-zinc-500 text-sm mt-1">MP4, MOV up to 100MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}