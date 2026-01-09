// app/api/videos/route.ts
// THIS FILE IS DEPRECATED - WE USE MUX WEBHOOKS NOW
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    message: "This endpoint is deprecated. Please use the Mux Upload flow." 
  });
}