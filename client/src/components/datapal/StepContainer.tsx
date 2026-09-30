import React from "react";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type StepStatus = "not_started" | "complete" | "error";

interface StepContainerProps {
  stepNumber: number;
  title: string;
  subtitle?: string;
  status: StepStatus;
  summaryText?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  errorMessage?: string;
}

export function StepContainer({
  stepNumber,
  title,
  subtitle,
  status,
  summaryText,
  isOpen,
  onToggle,
  children,
  errorMessage,
}: StepContainerProps) {
  const isComplete = status === "complete";
  const isError = status === "error";

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
        isError
          ? "border-rose-300 shadow-sm shadow-rose-100"
          : isOpen
          ? "border-gray-200/90 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/10"
          : "border-gray-200/80 shadow-sm hover:border-gray-300"
      }`}
    >
      {/* Step Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 sm:px-8 py-5 flex items-center justify-between text-left transition-colors hover:bg-slate-50/50"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Step Badge */}
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
              isComplete
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                : isError
                ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
                : isOpen
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            {isComplete ? (
              <Check className="w-5 h-5 stroke-[2.5]" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              stepNumber
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
              {isComplete && !isOpen && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready
                </span>
              )}
              {isError && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Needs Attention
                </span>
              )}
            </div>

            {/* One-line summary when collapsed */}
            {!isOpen && summaryText && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium truncate mt-0.5 max-w-xl">
                {summaryText}
              </p>
            )}

            {isOpen && subtitle && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {!isOpen && isComplete && (
            <span className="hidden sm:inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Edit
            </span>
          )}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 transition-transform ${
              isOpen ? "rotate-180 bg-slate-100" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Inline Error Message */}
      {isError && errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-6 sm:mx-8 mb-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-6 sm:px-8 pb-7 pt-2 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
