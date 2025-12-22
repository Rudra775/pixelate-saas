import { auth } from '@clerk/nextjs/server';
import { db as prisma } from '@/lib/prisma'; // ✅ Fixed import
import { Prisma } from "@prisma/client";
import Image from 'next/image';
import Link from 'next/link';
import DeleteButton from '@/components/DeleteButton';

export const dynamic = 'force-dynamic'; 

interface DashboardProps {
  // Next.js 15: searchParams is a Promise
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const authData = await auth();
  const userId = authData?.userId;

  if (!userId) {
    return <div className="p-8 text-center">Please sign in to view your dashboard.</div>;
  }

  // Await params before using them
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = 6; 
  const searchQuery = params.q?.trim() || '';

  // Fix: Search inside the RELATED Video model, not ProcessedFrame
  const whereClause: Prisma.ProcessedFrameWhereInput = {
    userId,
    ...(searchQuery
      ? {
          video: {
            originalName: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        }
      : {}),
  };

  const [total, frames] = await Promise.all([
    prisma.processedFrame.count({ where: whereClause }),
    prisma.processedFrame.findMany({
      where: whereClause,
      // Fix: Include the video relation to get the name
      include: {
        video: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 Your Processed Frames</h1>

      {/* Search */}
      <form className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          placeholder="Search by filename..."
          defaultValue={searchQuery}
          className="border px-3 py-2 rounded w-full"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Search
        </button>
      </form>

      {/* Grid */}
      {frames.length === 0 ? (
        <div className="text-center text-gray-600">
          {searchQuery ? 'No matches found.' : 'No processed assets yet.'}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 sm:grid-cols-2">
          {frames.map(frame => (
            <div key={frame.id} className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <div className="relative w-full aspect-square">
                <Image
                  src={frame.imageUrl}
                  // Fix: Use the included video relation for the name
                  alt={frame.video?.originalName || "Video Frame"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                {/* Fix: Use optional chaining in case video was deleted */}
                <p className="font-medium text-sm truncate">
                  {frame.video?.originalName || "Untitled Video"}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(frame.createdAt).toLocaleString()}
                </p>
                <DeleteButton id={frame.id} publicId={frame.publicId} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const qParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
            return (
              <Link
                key={pageNum}
                href={`/dashboard?page=${pageNum}${qParam}`}
                className={`px-3 py-1 rounded ${
                  pageNum === page ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}