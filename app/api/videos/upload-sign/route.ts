import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Generate a timestamp
  const timestamp = Math.round(new Date().getTime() / 1000);

  // 2. Generate the signature
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: "pixelate-uploads", // Organize your uploads
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({ timestamp, signature });
}