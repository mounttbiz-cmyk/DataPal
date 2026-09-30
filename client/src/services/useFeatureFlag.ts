import { useState, useEffect, useCallback } from "react";

export type FeatureFlagKey =
  | "datapal.pitchAngle.enabled"
  | "datapal.advancedRules.enabled"
  | "datapal.aiMatcher.enabled";

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAGS: FeatureFlagMeta[] = [
  {
    key: "datapal.pitchAngle.enabled",
    label: "Target Pitch Angle / Digital Gap",
    description: "Enable Pitch Angle selector (Missing Website, GBP, SEO gaps). When OFF, sends normal extract default.",
    defaultValue: false,
  },
  {
    key: "datapal.advancedRules.enabled",
    label: "Advanced Verification & Lead Delivery Rules",
    description: "Enable advanced verification filters and delivery options before Review step.",
    defaultValue: false,
  },
  {
    key: "datapal.aiMatcher.enabled",
    label: "AI Smart Matcher & Pitch Analyzer",
    description: "Enable AI service analyzer drawer to extract target requirements from website or brochure.",
    defaultValue: false,
  },
];

const STORAGE_PREFIX = "bizzpal_ff_";

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (val === null) {
      const meta = FEATURE_FLAGS.find(f => f.key === key);
      return meta?.defaultValue ?? false;
    }
    return val === "true";
  } catch {
    return false;
  }
}

export function setFeatureFlag(key: FeatureFlagKey, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
    window.dispatchEvent(new CustomEvent("datapal-flag-changed", { detail: { key, value } }));
  } catch (e) {
    console.error("Failed to write feature flag", e);
  }
}

export function useFeatureFlag(key: FeatureFlagKey): [boolean, (val: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => getFeatureFlag(key));

  useEffect(() => {
    const handleStorage = (e: StorageEvent | CustomEvent) => {
      setEnabled(getFeatureFlag(key));
    };

    window.addEventListener("storage", handleStorage as any);
    window.addEventListener("datapal-flag-changed", handleStorage as any);
    return () => {
      window.removeEventListener("storage", handleStorage as any);
      window.removeEventListener("datapal-flag-changed", handleStorage as any);
    };
  }, [key]);

  const toggle = useCallback((val: boolean) => {
    setFeatureFlag(key, val);
    setEnabled(val);
  }, [key]);

  return [enabled, toggle];
}
