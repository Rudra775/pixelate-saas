"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshOnProcess({ isProcessing }: { isProcessing: boolean }) {
  const router = useRouter();

  useEffect(() => {
    // Only run if the video is still processing
    if (!isProcessing) return;

    // Check every 5 seconds
    const interval = setInterval(() => {
      console.log("Polling for video status update...");
      router.refresh(); // This re-fetches the server data
    }, 5000);

    // Cleanup interval when component unmounts or processing finishes
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  return null; // This component renders nothing visibly
}