import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Sparkles, Filter, ChevronDown, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CategoryPickerSheet } from "./CategoryPickerSheet";

export type DetectedTargetType = "Business" | "Professional" | "Audience" | null;

interface AudienceRefineState {
  ageRange: string;
  gender: string;
  interests: string;
}

interface SearchInputStepProps {
  query: string;
  onQueryChange: (query: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  detectedType: DetectedTargetType;
  onDetectedTypeChange: (type: DetectedTargetType) => void;
  audienceRefine: AudienceRefineState;
  onAudienceRefineChange: (refine: AudienceRefineState) => void;
  showError?: boolean;
}

const BUSINESS_CHIPS = ["Cafes", "Pan Shops", "Gyms", "Car Repair", "Supermarkets", "Hotels"];
const PROFESSIONAL_CHIPS = ["Lawyers", "Doctors", "Chartered Accountants", "Architects", "Dentists"];
const AUDIENCE_CHIPS = ["Gen Z", "College Students", "Working Women 25 to 40", "Tech Founders"];

export function SearchInputStep({
  query,
  onQueryChange,
  selectedCategories,
  onCategoriesChange,
  detectedType,
  onDetectedTypeChange,
  audienceRefine,
  onAudienceRefineChange,
  showError,
}: SearchInputStepProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showRefine, setShowRefine] = useState(false);

  // Auto-detect type from query keywords
  useEffect(() => {
    if (!query.trim()) {
      onDetectedTypeChange(null);
      return;
    }
    const q = query.toLowerCase();

    // Audience patterns
    if (
      q.includes("gen z") ||
      q.includes("student") ||
      q.includes("women") ||
      q.includes("men") ||
      q.includes("youth") ||
      q.includes("founders") ||
      q.includes("professionals") ||
      q.includes("parents") ||
      q.includes("seniors")
    ) {
      onDetectedTypeChange("Audience");
      return;
    }

    // Professional patterns
    if (
      q.includes("doctor") ||
      q.includes("lawyer") ||
      q.includes("attorney") ||
      q.includes("accountant") ||
      q.includes("architect") ||
      q.includes("dentist") ||
      q.includes("engineer") ||
      q.includes("consultant") ||
      q.includes("advocate")
    ) {
      onDetectedTypeChange("Professional");
      return;
    }

    // Default to Business
    onDetectedTypeChange("Business");
  }, [query, onDetectedTypeChange]);

  const cycleDetectedType = () => {
    if (detectedType === "Business") onDetectedTypeChange("Professional");
    else if (detectedType === "Professional") onDetectedTypeChange("Audience");
    else onDetectedTypeChange("Business");
  };

  const handleChipClick = (chip: string) => {
    onQueryChange(chip);
  };

  const removeCategory = (cat: string) => {
    onCategoriesChange(selectedCategories.filter((c) => c !== cat));
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Search Input */}
      <div className="space-y-2">
        <div
          className={`flex items-center gap-3 bg-white rounded-2xl border px-4 py-2.5 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 ${
            showError && !query.trim() && selectedCategories.length === 0
              ? "border-rose-300 bg-rose-50/20"
              : "border-gray-200 shadow-sm"
          }`}
        >
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search anything... businesses, professionals, or groups of people"
            className="border-0 focus-visible:ring-0 p-0 text-sm sm:text-base font-medium text-slate-800 placeholder:text-slate-400 bg-transparent h-auto shadow-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Auto-detected Type Tag */}
          {detectedType && (
            <button
              type="button"
              onClick={cycleDetectedType}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                detectedType === "Audience"
                  ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  : detectedType === "Professional"
                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
              title="Click to change target type hint"
            >
              <Sparkles className="w-3 h-3" />
              <span>{detectedType}</span>
            </button>
          )}
        </div>

        {/* Selected Category Chips (if any selected via Browse Categories) */}
        {selectedCategories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Categories:
            </span>
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold"
              >
                {cat}
                <button
                  type="button"
                  onClick={() => removeCategory(cat)}
                  className="hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:underline ml-1"
            >
              + add more
            </button>
          </div>
        )}
      </div>

      {/* 2. Example Chips in 3 Labeled Rows */}
      <div className="space-y-3 pt-1">
        {/* Row 1: Businesses */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24 shrink-0">
            Businesses
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {BUSINESS_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  query.toLowerCase() === chip.toLowerCase()
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Professionals */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24 shrink-0">
            Professionals
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PROFESSIONAL_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  query.toLowerCase() === chip.toLowerCase()
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Audiences */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24 shrink-0">
            Audiences
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {AUDIENCE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  query.toLowerCase() === chip.toLowerCase()
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                {chip}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline ml-2 whitespace-nowrap"
            >
              Browse all categories →
            </button>
          </div>
        </div>
      </div>

      {/* 3. Optional Collapsed "Refine" row for Audience detection */}
      {detectedType === "Audience" && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowRefine(!showRefine)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Refine Audience Demographics (Optional)</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                showRefine ? "rotate-180" : ""
              }`}
            />
          </button>

          {showRefine && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3.5 bg-slate-50 rounded-2xl border border-gray-100">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Age Range
                </label>
                <Input
                  placeholder="e.g. 18-24, 25-40"
                  value={audienceRefine.ageRange}
                  onChange={(e) =>
                    onAudienceRefineChange({ ...audienceRefine, ageRange: e.target.value })
                  }
                  className="h-9 bg-white text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Gender
                </label>
                <Input
                  placeholder="e.g. All, Female, Male"
                  value={audienceRefine.gender}
                  onChange={(e) =>
                    onAudienceRefineChange({ ...audienceRefine, gender: e.target.value })
                  }
                  className="h-9 bg-white text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Interests / Keywords
                </label>
                <Input
                  placeholder="e.g. Tech, Fashion, Coffee"
                  value={audienceRefine.interests}
                  onChange={(e) =>
                    onAudienceRefineChange({ ...audienceRefine, interests: e.target.value })
                  }
                  className="h-9 bg-white text-xs rounded-xl"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Picker Sheet */}
      <CategoryPickerSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        selectedCategories={selectedCategories}
        onApply={(cats) => onCategoriesChange(cats)}
      />
    </div>
  );
}
