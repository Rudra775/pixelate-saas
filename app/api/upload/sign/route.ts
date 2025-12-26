// app/api/upload/sign/route.ts
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { paramsToSign } = body;

  // 1. Generate timestamp here
  // Note: We create it HERE to ensure the signature matches exactly
  const timestamp = Math.round((new Date).getTime() / 1000);

  // 2. Generate signature
  const signature = cloudinary.utils.api_sign_request(
    { ...paramsToSign, timestamp }, // Merge timestamp into params
    process.env.CLOUDINARY_API_SECRET as string
  );

  // 3. RETURN BOTH SIGNATURE AND TIMESTAMP
  return NextResponse.json({ signature, timestamp });
}