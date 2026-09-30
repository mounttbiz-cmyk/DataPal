import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_GROUPS, type CategoryGroup } from "@/config/businessCategories";
import { Search, X, Check, AlertTriangle } from "lucide-react";
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

interface CategoryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onApply: (categories: string[]) => void;
}

export function CategoryPickerSheet({
  isOpen,
  onClose,
  selectedCategories,
  onApply,
}: CategoryPickerSheetProps) {
  const [activeGroupId, setActiveGroupId] = useState<string>(CATEGORY_GROUPS[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(selectedCategories);
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false);

  // Sync temp selection when opened
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedCategories);
      setSearchQuery("");
    }
  }, [isOpen, selectedCategories]);

  // Active cluster
  const activeGroup = useMemo(() => {
    return CATEGORY_GROUPS.find((g) => g.id === activeGroupId) || CATEGORY_GROUPS[0];
  }, [activeGroupId]);

  // Filtered subcategories based on search
  const filteredSubcategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeGroup ? activeGroup.subcategories : [];
    }
    const q = searchQuery.toLowerCase();
    // Search across ALL groups if user is typing in search
    const results: { category: string; groupName: string }[] = [];
    for (const group of CATEGORY_GROUPS) {
      for (const sub of group.subcategories) {
        if (sub.toLowerCase().includes(q)) {
          results.push({ category: sub, groupName: group.name });
        }
      }
    }
    return results;
  }, [searchQuery, activeGroup]);

  const toggleCategory = (cat: string) => {
    setTempSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllGroup = () => {
    if (!activeGroup) return;
    const groupSubs = activeGroup.subcategories;
    const allSelected = groupSubs.every((s) => tempSelected.includes(s));
    if (allSelected) {
      setTempSelected((prev) => prev.filter((s) => !groupSubs.includes(s)));
    } else {
      setTempSelected((prev) => Array.from(new Set([...prev, ...groupSubs])));
    }
  };

  const handleSelectAllIndustries = () => {
    const allSubs = CATEGORY_GROUPS.flatMap((g) => g.subcategories);
    setTempSelected(allSubs);
    setShowSelectAllConfirm(false);
  };

  const handleDone = () => {
    onApply(tempSelected);
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-white z-[60]"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Browse Categories
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Select business industries & categories to target
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectAllConfirm(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Select All
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search all categories (e.g. Dentists, Cafes, Software)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-slate-50 border-gray-200 text-sm focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Two-Column Body: Clusters (left) | Subcategories (right) */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Left Column: Clusters */}
            {!searchQuery && (
              <div className="w-1/3 sm:w-2/5 border-r border-gray-100 overflow-y-auto bg-slate-50/70 p-2 space-y-1">
                {CATEGORY_GROUPS.map((group) => {
                  const isSelected = activeGroupId === group.id;
                  const groupSelectedCount = group.subcategories.filter((s) =>
                    tempSelected.includes(s)
                  ).length;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setActiveGroupId(group.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-1.5 ${
                        isSelected
                          ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{group.name}</span>
                      {groupSelectedCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {groupSelectedCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Right Column: Subcategories */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {!searchQuery && activeGroup && (
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {activeGroup.name}
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllGroup}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {activeGroup.subcategories.every((s) => tempSelected.includes(s))
                      ? "Deselect Group"
                      : "Select Group"}
                  </button>
                </div>
              )}

              {searchQuery ? (
                // Search Results
                <div className="space-y-1.5">
                  {(filteredSubcategories as { category: string; groupName: string }[]).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">
                      No categories found for "{searchQuery}"
                    </div>
                  ) : (
                    (filteredSubcategories as { category: string; groupName: string }[]).map(
                      (item) => {
                        const isChecked = tempSelected.includes(item.category);
                        return (
                          <button
                            key={item.category}
                            type="button"
                            onClick={() => toggleCategory(item.category)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                              isChecked
                                ? "bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-sm"
                                : "bg-white border-gray-100 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <div>{item.category}</div>
                              <div className="text-[11px] text-slate-400">{item.groupName}</div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                isChecked
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              ) : (
                // Group Subcategories
                <div className="space-y-1.5">
                  {activeGroup?.subcategories.map((sub) => {
                    const isChecked = tempSelected.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleCategory(sub)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-sm"
                            : "bg-white border-gray-100 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{sub}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0 space-y-3">
            {/* Selected Chips */}
            {tempSelected.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <span className="text-xs font-bold text-slate-500 shrink-0">Selected:</span>
                {tempSelected.slice(0, 4).map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold shrink-0"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {tempSelected.length > 4 && (
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    +{tempSelected.length - 4} more
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTempSelected([])}
                disabled={tempSelected.length === 0}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40"
              >
                Clear all
              </button>
              <Button
                type="button"
                onClick={handleDone}
                className="h-10 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm"
              >
                Done ({tempSelected.length})
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Select All Confirmation Dialog */}
      <AlertDialog open={showSelectAllConfirm} onOpenChange={setShowSelectAllConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle>Select all industries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will select all 70+ business categories across every sector. You can narrow down anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSelectAllIndustries}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              Confirm Select All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
