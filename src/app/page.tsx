import { ChatWindow } from "@/components/chat/ChatWindow";
import { PatientsPanel } from "@/components/PacientesPanel";

// Server Component (shell). Chat and panel are client components.
export default function Home() {
  return (
    <main className="mx-auto flex h-screen max-w-5xl flex-col p-4">
      <header className="mb-3 pl-10 md:pl-0">
        <h1 className="text-lg font-semibold text-slate-900">Qubio Ops Assistant</h1>
        <p className="text-xs text-slate-500">
          Technical case — streaming, tool calling, human-in-the-loop &amp; TanStack Query
        </p>
      </header>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <PatientsPanel />
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}
