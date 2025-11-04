// app/(app)/social-share/page.tsx
"use client";

import dynamic from "next/dynamic";

const SocialShareClient = dynamic(() => import("./SocialShareClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="text-lg text-gray-500 animate-pulse">Loading editor…</p>
    </div>
  ),
});

export default function SocialSharePage() {
  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Social Media Image Creator
      </h1>
      <SocialShareClient />
    </main>
  );
}
