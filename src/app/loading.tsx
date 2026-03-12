"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-[9999] animate-in fade-in duration-500 overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-25" />
        <div className="relative bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" strokeWidth={1.5} />
        </div>
      </div>
      
      <div className="mt-8 text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Carregando Sistema</h2>
        <p className="text-sm font-medium text-slate-400">Preparando seu ambiente acadêmico...</p>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
        <div className="h-full bg-blue-600 animate-progress-infinite" />
      </div>
    </div>
  );
}
