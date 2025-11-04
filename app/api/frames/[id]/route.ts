import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
    const authData = await auth();
    const userId = authData?.userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const frame = await prisma.processedFrame.findUnique({
    where: { id: params.id },
  });

  if (!frame || frame.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ⬇ delete from Cloudinary first
  try {
    await cloudinary.uploader.destroy(frame.publicId);
  } catch (e) {
    console.error('Cloudinary deletion failed:', e);
  }

  // ⬇ delete from DB
  await prisma.processedFrame.delete({ where: { id: frame.id } });

  return NextResponse.json({ ok: true });
}
