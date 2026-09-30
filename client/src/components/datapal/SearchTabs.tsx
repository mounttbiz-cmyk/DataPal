import React from "react";
import { Search, Users, Clock } from "lucide-react";

export type DataPalTab = "search" | "leads" | "history";

interface SearchTabsProps {
  activeTab: DataPalTab;
  onTabChange: (tab: DataPalTab) => void;
  leadsCount?: number;
  historyCount?: number;
}

export function SearchTabs({
  activeTab,
  onTabChange,
  leadsCount = 0,
  historyCount = 0,
}: SearchTabsProps) {
  const tabs = [
    {
      id: "search" as const,
      label: "Search",
      icon: Search,
      count: undefined,
    },
    {
      id: "leads" as const,
      label: "Leads",
      icon: Users,
      count: leadsCount,
    },
    {
      id: "history" as const,
      label: "History",
      icon: Clock,
      count: historyCount,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-fit max-w-full overflow-x-auto border border-gray-200/60 mb-8">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              isActive
                ? "bg-white text-indigo-700 shadow-sm border border-gray-100 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
