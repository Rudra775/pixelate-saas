"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, Settings, LogOut, Video } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <Home size={20} /> },
    { label: "Upload Video", href: "/upload", icon: <Upload size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full p-6 bg-zinc-950 border-r border-zinc-800 text-white">
      {/* Logo Area */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white">
          <Video size={18} fill="currentColor" />
        </div>
        <span className="text-xl font-bold tracking-tight">Pixelate</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Sign Out */}
      <div className="border-t border-zinc-800 pt-6">
        <SignOutButton>
          <button className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-red-400 transition-colors w-full group">
            <LogOut size={18} className="group-hover:stroke-red-400" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}