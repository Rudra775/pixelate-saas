"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function SocialResults({ video }: { video: any }) {
  const [copied, setCopied] = useState("");
  const data = video.socialData;

  if (!data) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Twitter Thread */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center">🐦 Twitter Thread</h3>
        <div className="space-y-4">
          {data.twitter.map((tweet: string, i: number) => (
            <div
              key={i}
              className="p-3 bg-gray-50 rounded text-sm relative group"
            >
              {tweet}
              <button
                onClick={() => copyToClipboard(tweet, `tw-${i}`)}
                className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
              >
                {copied === `tw-${i}` ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* LinkedIn Post */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center">💼 LinkedIn Post</h3>
        <div className="p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap relative h-full">
          {data.linkedin}
          <button
            onClick={() => copyToClipboard(data.linkedin, "li")}
            className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
          >
            {copied === "li" ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
