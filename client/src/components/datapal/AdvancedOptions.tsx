import React, { useState } from "react";
import { ChevronDown, ShieldCheck, Mail, Phone, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AdvancedRulesState {
  requirePhone: boolean;
  requireEmail: boolean;
  requireWebsite: boolean;
  minRating: number;
}

interface AdvancedOptionsProps {
  rules: AdvancedRulesState;
  onChangeRules: (rules: AdvancedRulesState) => void;
}

export function AdvancedOptions({ rules, onChangeRules }: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Advanced Verification & Lead Delivery Rules
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Filter by contact verification and minimum quality
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-5 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50">
            <Checkbox
              checked={rules.requirePhone}
              onCheckedChange={(c) => onChangeRules({ ...rules, requirePhone: !!c })}
            />
            <div className="text-xs">
              <div className="font-semibold text-slate-800">Verified Phone Number Only</div>
              <div className="text-slate-400">Skip entries without callable phone numbers</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50">
            <Checkbox
              checked={rules.requireEmail}
              onCheckedChange={(c) => onChangeRules({ ...rules, requireEmail: !!c })}
            />
            <div className="text-xs">
              <div className="font-semibold text-slate-800">Verified Email Address Only</div>
              <div className="text-slate-400">Include only leads with verifiable domains</div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
