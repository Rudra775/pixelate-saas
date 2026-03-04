import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db as prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { title } = body;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const resolvedParams = await context.params;

    const video = await prisma.video.update({
      where: {
        id: resolvedParams.id,
        userId: userId,
      },
      data: {
        originalName: title,
      },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("[VIDEO_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await context.params;

    const video = await prisma.video.findUnique({
      where: {
        id: resolvedParams.id,
        userId: userId,
      }
    });

    if (!video) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await prisma.video.delete({
      where: {
        id: resolvedParams.id,
      },
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("[VIDEO_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}