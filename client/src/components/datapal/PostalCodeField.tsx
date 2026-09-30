import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { getCountryConfig, validatePostalCode } from "@/services/countryConfig";

interface PostalCodeFieldProps {
  countryCode?: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function PostalCodeField({
  countryCode,
  value,
  onChange,
  disabled = false,
}: PostalCodeFieldProps) {
  const config = useMemo(() => {
    return countryCode ? getCountryConfig(countryCode) : null;
  }, [countryCode]);

  // If country has no postal code system (or not selected), hide or show disabled
  if (!config) {
    return (
      <div className="space-y-1.5 opacity-60">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Postal Code / PIN
        </label>
        <Input
          disabled
          placeholder="Select a country first"
          className="h-12 bg-slate-50 rounded-2xl border-gray-200 text-sm cursor-not-allowed"
        />
      </div>
    );
  }

  const validation = useMemo(() => {
    return validatePostalCode(config.code, value);
  }, [config.code, value]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
        <span>
          {config.postalCodeLabel}{" "}
          <span className="text-slate-400 font-normal normal-case">(optional)</span>
        </span>
      </label>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={config.postalCodePlaceholder}
        className={`h-12 bg-white rounded-2xl border text-sm font-medium transition-all ${
          disabled
            ? "bg-slate-50 border-gray-200 opacity-60 cursor-not-allowed"
            : !validation.valid && value
            ? "border-amber-300 focus:border-amber-400 ring-2 ring-amber-500/10"
            : "border-gray-200 focus:border-indigo-400 ring-2 ring-indigo-500/10"
        }`}
      />

      {!validation.valid && value && (
        <p className="text-[11px] text-amber-600 font-medium">
          {validation.message}
        </p>
      )}
    </div>
  );
}
