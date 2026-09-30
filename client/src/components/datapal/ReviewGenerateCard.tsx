import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "./CountryOption";
import { ArrowRight, Loader2, Sparkles, AlertTriangle, Layers } from "lucide-react";
import { StructuredLocationScope, locationService } from "@/services/locationService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReviewGenerateCardProps {
  query: string;
  categories: string[];
  scope: StructuredLocationScope;
  detectedType: string | null;
  isSearching: boolean;
  onGenerate: () => void;
  isStep1Valid: boolean;
  isLocationValid: boolean;
}

export function ReviewGenerateCard({
  query,
  categories,
  scope,
  detectedType,
  isSearching,
  onGenerate,
  isStep1Valid,
  isLocationValid,
}: ReviewGenerateCardProps) {
  const [showLargeScopeConfirm, setShowLargeScopeConfirm] = useState(false);

  // Format Plain English Scope
  const formattedScope = locationService.formatScopeDescription(scope);

  // Target summary display
  const targetSummary = query.trim()
    ? query.trim()
    : categories.length > 0
    ? categories.slice(0, 3).join(", ") + (categories.length > 3 ? ` +${categories.length - 3} more` : "")
    : "Not specified";

  // Check if scope is very large (e.g. >1 country or nationwide across big country)
  const isLargeScope =
    scope.countries.length > 1 ||
    (scope.countries.length === 1 && scope.states === "ALL" && scope.cities === "ALL");

  const handleButtonClick = () => {
    if (isLargeScope) {
      setShowLargeScopeConfirm(true);
    } else {
      onGenerate();
    }
  };

  const canGenerate = isStep1Valid && isLocationValid && !isSearching;

  // Helper text if disabled
  let disabledHelper = "";
  if (!isStep1Valid) {
    disabledHelper = "Enter search keywords or pick categories in Step 1";
  } else if (!isLocationValid) {
    disabledHelper = "Select at least one country in Step 2";
  }

  const primaryCountryCode = scope.countries[0];

  return (
    <>
      <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Summary */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Looking for
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {targetSummary}
            </span>
            {detectedType && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {detectedType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              In
            </span>
            {primaryCountryCode && (
              <CountryFlag code={primaryCountryCode} className="w-4 h-3 shrink-0" />
            )}
            <span className="font-semibold text-slate-800 truncate">
              {formattedScope}
            </span>
            {scope.area && (
              <span className="text-slate-500 truncate">
                • {scope.area}
              </span>
            )}
            {scope.postalCode && (
              <span className="text-slate-500 font-mono">
                [{scope.postalCode}]
              </span>
            )}
          </div>

          {disabledHelper && (
            <p className="text-xs text-amber-600 font-medium pt-1">
              ⓘ {disabledHelper}
            </p>
          )}
        </div>

        {/* Right: Primary Action Button */}
        <div className="shrink-0 flex flex-col items-stretch md:items-end gap-1.5">
          <Button
            type="button"
            onClick={handleButtonClick}
            disabled={!canGenerate}
            className="h-13 px-8 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:shadow-none min-w-[200px]"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span>Generate data</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <span className="text-[11px] text-slate-400 font-medium text-center md:text-right">
            Saves live verified leads to your dashboard
          </span>
        </div>
      </div>

      {/* Large Scope Confirmation Modal */}
      <AlertDialog open={showLargeScopeConfirm} onOpenChange={setShowLargeScopeConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <AlertDialogTitle>Broad Search Scope</AlertDialogTitle>
            <AlertDialogDescription>
              You are searching across <strong>{formattedScope}</strong>. Extracting records for this large of an area may take a moment to query all live regional endpoints.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Adjust Scope</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLargeScopeConfirm(false);
                onGenerate();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              Continue & Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
