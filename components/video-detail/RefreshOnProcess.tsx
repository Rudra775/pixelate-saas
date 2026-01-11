"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshOnProcess({ isProcessing }: { isProcessing: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      // This re-runs the server-side code (page.tsx) to fetch new DB data
      // without doing a full browser refresh
      router.refresh(); 
      console.log("🔄 Polling for updates...");
    }, 4000);

    return () => clearInterval(interval);
  }, [isProcessing, router]);

  return null;
}