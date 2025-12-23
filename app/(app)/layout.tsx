import Sidebar from "@/components/shell/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex-shrink-0 hidden md:flex flex-col">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-zinc-950">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}