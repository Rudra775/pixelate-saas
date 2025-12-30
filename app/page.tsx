import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  // 1. If user is logged in, go to Dashboard
  if (userId) {
    redirect("/dashboard");
  }

  // 2. If not logged in, go to Sign In
  redirect("/sign-in");
}