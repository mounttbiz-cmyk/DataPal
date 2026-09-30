import React from "react";
import { Sparkles, Globe, Smartphone, Search, ShoppingCart, Award } from "lucide-react";

export interface PitchRequirement {
  id: string;
  label: string;
  desc: string;
}

export const PITCH_REQUIREMENTS: PitchRequirement[] = [
  { id: "all", label: "Normal Extract (All Business Details)", desc: "Full extraction without specific gap filtering" },
  { id: "website", label: "Missing Website", desc: "Target businesses needing web design & development" },
  { id: "gbp", label: "Missing Google Business Profile", desc: "Target local businesses needing Google listing & SEO" },
  { id: "social", label: "Missing Social Media", desc: "Target businesses needing social media marketing" },
  { id: "online_ordering", label: "Missing Online Ordering", desc: "Target food & retail stores needing ordering systems" },
  { id: "logo", label: "Missing Logo / Branding", desc: "Target businesses needing visual identity & logos" },
];

interface PitchAngleStepProps {
  selectedRequirement: string;
  onChangeRequirement: (id: string) => void;
}

export function PitchAngleStep({
  selectedRequirement,
  onChangeRequirement,
}: PitchAngleStepProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Target Digital Gap / Pitch Angle (Optional)
        </label>
        <span className="text-xs text-slate-400 font-medium">Single Control</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {PITCH_REQUIREMENTS.map((req) => {
          const isSelected = selectedRequirement === req.id;
          return (
            <button
              key={req.id}
              type="button"
              onClick={() => onChangeRequirement(req.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm"
                  : "bg-white border-gray-200/80 hover:border-indigo-200 hover:bg-slate-50/50"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm text-slate-900 mb-1">
                {req.label}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {req.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
