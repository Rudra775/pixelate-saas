"use client";
import { useEffect, useRef, useState, useMemo } from "react";

// Define the expected structure for clarity
interface ProcessStatus {
  state: "queued" | "processing" | "completed" | "failed";
  jobId?: string;
  result?: { url: string; publicId: string }; // Assuming result includes publicId/url needed for display/delete
  error?: string;
}

export default function FrameTest() {
  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<ProcessStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // --- HANDLERS ---
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    setStatus(null); // Reset status for new upload
    setJobId("");

    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setJobId(data.jobId);
      setStatus({ state: "queued" });
    } catch (error) {
      console.error("Submission Error:", error);
      setStatus({ state: "failed", error: "Upload failed. Check console." });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete() {
    if (!status?.result) return;
    setIsDeleting(true);

    // The DELETE API you provided uses the ID from the URL: /api/jobs/{id}
    // You'll need to pass the ID of the DB record here.
    // Assuming the 'jobId' returned from the initial POST is the same as the 'id'
    // used by your DELETE route (e.g., the prisma.processedFrame.id)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");

      // Clear the UI after successful deletion
      setJobId("");
      setStatus(null);
      alert("Frame deleted successfully!");
    } catch (error) {
      console.error("Deletion Error:", error);
      alert("Deletion failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  // --- POLLING EFFECT ---
  useEffect(() => {
    if (!jobId) return;

    // 1. Create a variable to track if this specific effect is active
    let isMounted = true;

    const intervalId = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}`);

        // If unmounted during fetch, stop here
        if (!isMounted) return;

        if (!r.ok) throw new Error("Fetch failed");

        const d = await r.json();
        setStatus(d);

        if (d.state === "completed" || d.state === "failed") {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Optional: stop polling on error to prevent infinite loops
        // clearInterval(intervalId);
      }
    }, 2000);

    // 2. ✅ CRITICAL: The Cleanup Function
    // React runs this when the component unmounts or jobId changes
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [jobId]); // Dependency array ensures we restart if ID changes

  // --- UI STATUS MEMO ---
  const statusDisplay = useMemo(() => {
    if (!status) return null;

    switch (status.state) {
      case "queued":
        return (
          <p className="text-yellow-500 font-medium">
            ⏳ Job Queued. Waiting for processing...
          </p>
        );
      case "processing":
        return (
          <p className="text-blue-500 font-medium animate-pulse">
            ⚙️ Processing video. Please wait...
          </p>
        );
      case "completed":
        return (
          <p className="text-green-500 font-medium">
            ✅ Processing complete! Best frame shown below.
          </p>
        );
      case "failed":
        return (
          <p className="text-red-500 font-medium">
            ❌ Processing failed. {status.error || "Please try again."}
          </p>
        );
      default:
        return null;
    }
  }, [status]);

  return (
    <div className="p-8 max-w-2xl mx-auto bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Cloudinary Showcase</h1>

      <form
        onSubmit={onSubmit}
        className="flex items-center space-x-4 p-4 border border-gray-700 rounded-lg bg-gray-800"
      >
        {/* Hiding default input and using a label for better styling */}
        <label className="bg-gray-700 hover:bg-gray-600 transition duration-150 text-white font-semibold py-2 px-4 rounded cursor-pointer">
          Choose Video File
          <input
            type="file"
            name="file"
            accept="video/*"
            required
            className="hidden" // Hide the default input
          />
        </label>

        <button
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 transition duration-150 font-bold rounded disabled:opacity-50"
          type="submit"
          disabled={isUploading || !!jobId} // Disable if uploading or a job is already running
        >
          {isUploading ? "Uploading..." : "Upload & Process"}
        </button>
      </form>

      {jobId && (
        <p className="mt-4 text-sm text-gray-400">Tracking Job ID: {jobId}</p>
      )}

      {/* Displaying human-readable status */}
      <div className="mt-4 p-4 rounded bg-gray-800 border border-gray-700">
        {statusDisplay}

        {/* Optional: Keep the raw status for debugging */}
        {/* {status && <pre className="mt-2 text-xs text-gray-400">{JSON.stringify(status, null, 2)}</pre>} */}
      </div>

      {/* FINAL RESULT DISPLAY */}
      {status?.state === "completed" && status?.result?.url && (
        <div className="mt-6 p-4 border border-green-700 rounded-lg bg-gray-800">
          <p className="font-bold text-lg mb-3 text-green-400">
            🎉 Best Frame Extracted
          </p>
          <img
            src={status.result.url}
            alt="best frame"
            className="w-full max-w-xl mx-auto border border-gray-600 rounded-lg shadow-xl"
          />

          <button
            onClick={handleDelete}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 font-semibold rounded disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "🗑️ Delete Frame & Record"}
          </button>
        </div>
      )}
    </div>
  );
}
