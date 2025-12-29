"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isLoaded) return null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Step 1: Create the user
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Step 2: Prepare verification (email code)
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Step 3: Redirect to verification page
      // PASS THE EMAIL so the verify page knows who to verify!
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.message || "Sign-up failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-zinc-800">
        <h1 className="text-3xl font-bold text-center mb-6">
          Create Account 🚀
        </h1>
        
        {/* Captcha Container (Required for Custom Flows) */}
        <div id="clerk-captcha" />

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-zinc-950 border-zinc-800 text-white focus:ring-2 focus:ring-violet-600 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-zinc-950 border-zinc-800 text-white focus:ring-2 focus:ring-violet-600 outline-none"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-lg transition-all active:scale-[0.98]"
          >
            Continue
          </button>
        </form>

        <p className="text-sm text-zinc-500 text-center mt-6">
          Already have an account?{" "}
          <a href="/sign-in" className="text-violet-400 hover:text-violet-300 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}