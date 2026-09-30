import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, ShieldAlert, Sparkles } from "lucide-react";
import { FEATURE_FLAGS, useFeatureFlag, FeatureFlagKey } from "@/services/useFeatureFlag";

interface AdminFeatureFlagsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminFeatureFlagsDrawer({ isOpen, onClose }: AdminFeatureFlagsDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6 bg-white z-[70] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <SheetTitle className="text-xl font-bold text-slate-900">
            Super Admin: DataPal Features
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Control modular DataPal feature gates instantly without redeploying code.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              By default, all optional steps are disabled to keep the UI clean (What → Where → Generate). You can toggle them here.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURE_FLAGS.map((flag) => (
              <FeatureToggleRow key={flag.key} flagKey={flag.key} label={flag.label} description={flag.description} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FeatureToggleRow({
  flagKey,
  label,
  description,
}: {
  flagKey: FeatureFlagKey;
  label: string;
  description: string;
}) {
  const [enabled, toggle] = useFeatureFlag(flagKey);

  return (
    <div className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-sm flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        <div className="pt-1">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {enabled ? "ACTIVE (ON)" : "DEFAULT (OFF)"}
          </span>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} className="shrink-0 mt-1" />
    </div>
  );
}
