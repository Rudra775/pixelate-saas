import {auth} from "@clerk/nextjs/server"
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import DeleteButton from '@/components/DeleteButton';

export default async function DashboardPage() {

  const authData = await auth();  
  const userId = authData?.userId;
  
  if (!userId) {
    return <div className="p-8 text-center">Please sign in to view your dashboard.</div>;
  }

  const frames = await prisma.processedFrame.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (frames.length === 0) {
    return <div className="p-8 text-center">No processed assets yet.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Your Processed Frames</h1>
      <div className="grid gap-6 md:grid-cols-3 sm:grid-cols-2">
        {frames.map(frame => (
          <div
            key={frame.id}
            className="border rounded-lg shadow-sm overflow-hidden bg-white"
          >
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
    </div>
  );
}
