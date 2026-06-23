"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { formatDate } from "@/lib/formatDate";

interface Patient {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
}

function PatientList({ data, isLoading, isError, refetch }: {
  data?: Patient[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading && <p className="p-4 text-xs text-slate-400">Loading…</p>}
      {isError && (
        <div className="p-4">
          <p className="text-xs text-red-500">Failed to load patients.</p>
          <button
            onClick={refetch}
            className="mt-2 text-xs text-brand-600 underline"
          >
            Try again
          </button>
        </div>
      )}
      {data?.map((p) => (
        <div key={p.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
          <p className="text-xs font-medium text-slate-800">{p.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">{p.id}</p>
          <p className="mt-1 text-[10px] text-slate-500">Last visit: {formatDate(p.lastVisit)}</p>
        </div>
      ))}
    </div>
  );
}

// Demonstrates TanStack Query for non-streaming server-state.
// On md+ (≥768px): fixed sidebar. Below md: floating button + slide-in drawer.
export function PatientsPanel() {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json() as Promise<Patient[]>;
    },
  });

  const header = (
    <div className="border-b border-slate-200 px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patients</h2>
      <p className="mt-0.5 text-[10px] text-slate-400">via TanStack Query</p>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {header}
        <PatientList data={data} isLoading={isLoading} isError={isError} refetch={refetch} />
      </aside>

      {/* ── Mobile: hamburger + drawer (< md) ── */}
      <div className="md:hidden">
        {/* Hamburger button — top-left corner */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open patients list"
          className="fixed top-4 left-4 z-40 flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Slide-in drawer */}
        <div
          className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patients</h2>
              <p className="mt-0.5 text-[10px] text-slate-400">via TanStack Query</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <PatientList data={data} isLoading={isLoading} isError={isError} refetch={refetch} />
        </div>
      </div>
    </>
  );
}
