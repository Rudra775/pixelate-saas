import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Generate the signature
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: 'pixelate-uploads', // Make sure this matches what you send from frontend
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  // 👇 RETURN THE API KEY HERE
  return NextResponse.json({ 
    timestamp, 
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY 
  });
}