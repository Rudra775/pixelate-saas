"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  if (!isLoaded) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      // 1. Submit the code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      // 2. Check status
      if (completeSignUp.status === "complete") {
        // CRITICAL: Set the session active!
        // This is what actually logs the user in.
        await setActive({ session: completeSignUp.createdSessionId });
        
        // 3. Redirect to Dashboard (NOT Sign In)
        router.push("/dashboard");
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error("Verification failed", err);
      alert(err.errors?.[0]?.message || "Invalid Code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Check your Email 📧</h1>
        <p className="text-zinc-400 text-center mb-6 text-sm">
          We sent a code to <span className="text-white font-medium">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter verification code"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-xl tracking-widest focus:ring-2 focus:ring-violet-600 outline-none"
          />
          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            {verifying ? "Verifying..." : "Verify & Go to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
