import React from "react";
import { Sparkles, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DataPalHeaderProps {
  onOpenSettings?: () => void;
  hasActiveFlags?: boolean;
}

export function DataPalHeader({ onOpenSettings, hasActiveFlags }: DataPalHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Data<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Pal</span>
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-0.5 px-2.5 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live APIs
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Universal search for businesses, professionals, and audiences worldwide.
          </p>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors shadow-sm"
            title="Feature Flags & Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Admin Flags</span>
            {hasActiveFlags && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
