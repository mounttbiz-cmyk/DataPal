import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, Check, Search, Plus } from "lucide-react";
import { CountryFlag } from "./CountryOption";

export interface ComboboxOption {
  id: string;
  name: string;
  code?: string;
  group?: string; // e.g. Country Name or State Name
  dialCode?: string;
  isPopular?: boolean;
}

interface MultiSelectComboboxProps {
  label: string;
  stepBadge?: string;
  placeholder?: string;
  options: ComboboxOption[];
  selectedValues: string[]; // array of names or IDs, or ["ALL"]
  onChange: (values: string[]) => void;
  disabled?: boolean;
  disabledReason?: string;
  selectAllLabel?: string;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
  isCountry?: boolean;
  loading?: boolean;
}

export function MultiSelectCombobox({
  label,
  stepBadge,
  placeholder = "Select...",
  options,
  selectedValues,
  onChange,
  disabled = false,
  disabledReason,
  selectAllLabel,
  isAllSelected = false,
  onToggleSelectAll,
  isCountry = false,
  loading = false,
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.code && opt.code.toLowerCase().includes(q)) ||
        (opt.dialCode && opt.dialCode.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Grouped options if options have `group`
  const groupedOptions = useMemo(() => {
    const map = new Map<string, ComboboxOption[]>();
    for (const opt of filteredOptions) {
      const g = opt.group || "Default";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return map;
  }, [filteredOptions]);

  const toggleOption = (optName: string) => {
    if (isAllSelected) {
      // If was All Selected, switch to just this one
      onChange([optName]);
      return;
    }

    if (selectedValues.includes(optName)) {
      const next = selectedValues.filter((v) => v !== optName);
      onChange(next);
    } else {
      onChange([...selectedValues, optName]);
    }
  };

  const removeValue = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    if (isAllSelected) {
      if (onToggleSelectAll) onToggleSelectAll();
      return;
    }
    onChange(selectedValues.filter((v) => v !== val));
  };

  const handleUseTyped = () => {
    if (!searchQuery.trim()) return;
    const typed = searchQuery.trim();
    if (!selectedValues.includes(typed)) {
      onChange([...selectedValues, typed]);
    }
    setSearchQuery("");
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && !searchQuery && selectedValues.length > 0) {
      onChange(selectedValues.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {stepBadge && (
            <span className="w-4 h-4 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-extrabold">
              {stepBadge}
            </span>
          )}
          {label}
        </span>
        {disabled && disabledReason && (
          <span className="text-[11px] font-normal normal-case text-slate-400">
            ({disabledReason})
          </span>
        )}
      </label>

      {/* Main Trigger Box */}
      <div className="relative">
        <div
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
          className={`min-h-[48px] w-full px-3.5 py-2 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
            disabled
              ? "bg-slate-50 border-gray-200/60 opacity-60 cursor-not-allowed"
              : isOpen
              ? "bg-white border-indigo-400 ring-2 ring-indigo-500/10 shadow-sm"
              : "bg-white border-gray-200 hover:border-indigo-300 shadow-sm"
          }`}
        >
          {/* Selected Chips */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {isAllSelected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold">
                {selectAllLabel || "All Selected"}
                {onToggleSelectAll && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectAll();
                    }}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ) : selectedValues.length === 0 ? (
              <span className="text-sm text-slate-400 font-medium">
                {placeholder}
              </span>
            ) : (
              <>
                {selectedValues.slice(0, 3).map((val) => {
                  const opt = options.find((o) => o.name === val || o.code === val);
                  return (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200/80 rounded-lg text-xs font-medium max-w-[140px] truncate"
                    >
                      {isCountry && opt?.code && (
                        <CountryFlag code={opt.code} className="w-4 h-3" />
                      )}
                      <span className="truncate">{val}</span>
                      <button
                        type="button"
                        onClick={(e) => removeValue(e, val)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {selectedValues.length > 3 && (
                  <span className="text-xs font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-md">
                    +{selectedValues.length - 3} more
                  </span>
                )}
              </>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div
            className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search Box */}
            <div className="p-2.5 border-b border-gray-100 flex items-center gap-2 bg-slate-50/60">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full bg-transparent border-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  Loading {label.toLowerCase()}...
                </div>
              ) : (
                <>
                  {/* Row 1: Select All option */}
                  {selectAllLabel && onToggleSelectAll && (
                    <button
                      type="button"
                      onClick={() => onToggleSelectAll()}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-left border-b border-gray-100 hover:bg-indigo-50/60 font-semibold transition-colors ${
                        isAllSelected ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                      }`}
                    >
                      <span>{selectAllLabel}</span>
                      {isAllSelected && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                    </button>
                  )}

                  {/* "Use as typed" option if user searched something not found */}
                  {searchQuery.trim() &&
                    !filteredOptions.some(
                      (o) => o.name.toLowerCase() === searchQuery.trim().toLowerCase()
                    ) && (
                      <button
                        type="button"
                        onClick={handleUseTyped}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm text-left hover:bg-indigo-50 text-indigo-700 border-b border-gray-100 font-medium"
                      >
                        <Plus className="w-4 h-4 text-indigo-500" />
                        <span>Use "<strong>{searchQuery.trim()}</strong>" as typed</span>
                      </button>
                    )}

                  {/* Filtered options */}
                  {filteredOptions.length === 0 && !searchQuery.trim() ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      No options available
                    </div>
                  ) : (
                    Array.from(groupedOptions.entries()).map(([groupName, groupOpts]) => (
                      <div key={groupName}>
                        {groupName !== "Default" && (
                          <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-y border-gray-100">
                            {groupName}
                          </div>
                        )}
                        {groupOpts.map((opt) => {
                          const isSelected =
                            isAllSelected ||
                            selectedValues.includes(opt.name) ||
                            (opt.code && selectedValues.includes(opt.code));

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleOption(opt.name)}
                              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left hover:bg-indigo-50/50 transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/70 text-indigo-900 font-semibold"
                                  : "text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {isCountry && opt.code && (
                                  <CountryFlag code={opt.code} className="w-4 h-3 shrink-0" />
                                )}
                                <span className="truncate">{opt.name}</span>
                                {opt.dialCode && (
                                  <span className="text-xs text-slate-400 font-mono">
                                    {opt.dialCode}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 stroke-[3] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
