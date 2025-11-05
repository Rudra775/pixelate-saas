import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from "@prisma/client";
import Image from 'next/image';
import Link from 'next/link';
import DeleteButton from '@/components/DeleteButton';

export const dynamic = 'force-dynamic'; // ensures SSR each request

interface DashboardProps {
  searchParams: { page?: string; q?: string };
}

export default async function DashboardPage({ searchParams }: DashboardProps) {

    const authData = await auth();
    const userId = authData?.userId;

  if (!userId) {
    return <div className="p-8 text-center">Please sign in to view your dashboard.</div>;
  }

  const page = parseInt(searchParams.page || '1');
  const limit = 6; // 6 items per page
  const searchQuery = searchParams.q?.trim() || '';

  const whereClause: Prisma.ProcessedFrameWhereInput = {
      userId,
      ...(searchQuery
        ? {
            videoName: {
              contains: searchQuery,
              mode: "insensitive",
            },
          }
        : {}),
    };
    
    const [total, frames] = await Promise.all([
      prisma.processedFrame.count({ where: whereClause }),
      prisma.processedFrame.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 Your Processed Frames</h1>

      {/* 🔍 Search */}
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

      {/* 🖼 Grid */}
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
                  alt={frame.videoName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="font-medium text-sm truncate">{frame.videoName}</p>
                <p className="text-xs text-gray-500">
                  {new Date(frame.createdAt).toLocaleString()}
                </p>
                <DeleteButton id={frame.id} publicId={frame.publicId} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📄 Pagination */}
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
