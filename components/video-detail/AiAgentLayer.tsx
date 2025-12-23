"use client";
import { useState } from "react";
import { Copy, Check, Twitter, Linkedin, Instagram, Youtube, FileText, BrainCircuit } from "lucide-react";
import { Video } from "@prisma/client";

export default function AiAgentLayer({ video }: { video: Video }) {
  const [activeTab, setActiveTab] = useState<"twitter" | "linkedin" | "instagram" | "youtube">("twitter");
  const [copied, setCopied] = useState(false);

  // Safely access socialData, defaults to empty object if null
  const socialData = (video.socialData as any) || {};

  const getContent = () => {
    switch(activeTab) {
      case "twitter": return socialData.twitter?.join("\n\n---\n\n") || "No content generated.";
      case "linkedin": return socialData.linkedin || "No content generated.";
      case "instagram": return socialData.instagram || "No content generated.";
      case "youtube": return socialData.youtube || "No content generated.";
      default: return "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "twitter", icon: <Twitter size={18} />, label: "X / Twitter" },
    { id: "linkedin", icon: <Linkedin size={18} />, label: "LinkedIn" },
    { id: "instagram", icon: <Instagram size={18} />, label: "Instagram" },
    { id: "youtube", icon: <Youtube size={18} />, label: "YouTube" },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-full flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <BrainCircuit className="text-violet-500" size={20} />
          AI Intelligence Layer
        </h3>
        <p className="text-zinc-400 text-sm">Multi-platform content generated from transcription.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 text-sm font-medium flex flex-col items-center justify-center gap-1.5 transition-all relative ${
              activeTab === tab.id 
                ? "text-violet-400 bg-zinc-900" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            {tab.icon}
            <span className="text-xs">{tab.label}</span>
            {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 animate-in fade-in slide-in-from-bottom-1 duration-200" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-5 bg-zinc-900 overflow-y-auto custom-scrollbar relative font-mono text-sm leading-relaxed">
        {/* Mock Browser/App Chrome for realism */}
        <div className="mb-4 flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
            </div>
            <div className="text-xs text-zinc-600 ml-2 font-sans">Preview: {tabs.find(t => t.id === activeTab)?.label}</div>
        </div>

        <div className="text-zinc-300 whitespace-pre-wrap p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-lg">
          {getContent()}
        </div>
      </div>

      {/* Footer / Copy Action */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
        <button 
          onClick={handleCopy}
          disabled={!getContent() || getContent() === "No content generated."}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-violet-500/20"
        >
          {copied ? <Check size={18} className="animate-in zoom-in spin-in" /> : <Copy size={18} />}
          {copied ? "Copied to Clipboard!" : "Copy Generated Content"}
        </button>
      </div>
    </div>
  );
}