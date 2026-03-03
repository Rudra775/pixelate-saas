"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export default function RefreshOnProcess({ isProcessing }: { isProcessing: boolean }) {
  const router = useRouter();
  const prevIsProcessing = useRef(isProcessing);

  useEffect(() => {
    // If it was processing before, and now it is NOT processing, it means completion!
    if (prevIsProcessing.current && !isProcessing) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }
    prevIsProcessing.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      // This re-runs the server-side code (page.tsx) to fetch new DB data
      // without doing a full browser refresh
      router.refresh(); 
      console.log("🔄 Polling for updates...");
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isProcessing, router]);

  return null;
}