// app/home/page.tsx
import HomeClient from "./HomeClient";
import { prisma } from "@/lib/prisma";

// Revalidate every 60 seconds (Incremental Static Regeneration)
export const revalidate = 60;

export default async function HomePage() {
  // Fetch top videos at build or ISR time
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Pass them as initial static data
  return <HomeClient initialVideos={videos} />;
}
