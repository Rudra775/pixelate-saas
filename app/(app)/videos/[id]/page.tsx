import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, FileText } from "lucide-react";
import VideoPlayer from "@/components/video-detail/VideoPlayer";
import AiAgentLayer from "@/components/video-detail/AiAgentLayer";
import MediaGallery from "@/components/video-detail/MediaGallery"; //

// Force dynamic rendering so we always get the latest status
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoWorkstationPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) return redirect("/sign-in");

  const video = await db.video.findUnique({
    where: { id },
  });

  if (!video) return notFound();
  // Optional: Restrict access to owner
  // if (video.userId !== userId) return notFound();

  const isProcessing = video.status === "processing";

  return (
    <div className="min-h-screen text-white">
      {/* Header & Breadcrumbs */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm mb-4 inline-flex transition-colors"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {video.originalName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock size={14} /> {Math.round(video.duration)}s
              </span>
              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  isProcessing
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-green-500/10 text-green-500"
                }`}
              >
                {video.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Visuals (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Video Player */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative group">
            {/* Overlay for processing state */}
            {isProcessing && (
              <div className="absolute inset-0 bg-zinc-950/80 z-10 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-semibold">
                  AI Processing in Progress
                </h3>
                <p className="text-zinc-400 text-sm mt-2">
                  Your video is being analyzed. Smart crops and AI insights will
                  appear here shortly.
                </p>
              </div>
            )}
            <VideoPlayer publicId={video.publicId} />
          </div>

          <div
            className={
              isProcessing
                ? "opacity-50 pointer-events-none filter grayscale transition-all"
                : ""
            }
          >
            <MediaGallery publicId={video.publicId} />
          </div>
        </div>

        {/* RIGHT COLUMN: AI Intelligence Layer (1/3 width) */}
        <div
          className={`lg:col-span-1 h-[calc(100vh-200px)] sticky top-8 ${
            isProcessing
              ? "opacity-50 pointer-events-none filter grayscale transition-all"
              : ""
          }`}
        >
          <AiAgentLayer video={video} />
        </div>
      </div>
    </div>
  );
}
