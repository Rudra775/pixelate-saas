// app/dashboard/page.tsx
import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import VideoCard from "@/components/video-detail/VideoCard";
import { db as prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!userId) {
    redirect("/sign-in");
  }

  // 1. Fetch Videos & The Best Thumbnail
  // We use 'include' to fetch the highest-scoring frame for each video efficiently
  const videos = await prisma.video.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      frames: {
        orderBy: { score: "desc" }, // Get the "smartest" frame
        take: 1, // Only fetch ONE
      },
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link
          href="/upload"
          className="bg-white text-zinc-950 px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Upload New Video
        </Link>
      </div>

      {/* Empty State */}
      {videos.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500">No videos processed yet.</p>
          <Link
            href="/upload"
            className="text-violet-400 hover:underline mt-2 inline-block"
          >
            Start your first upload
          </Link>
        </div>
      ) : (
        /* Video Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`} className="group">
              <VideoCard video={video} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


