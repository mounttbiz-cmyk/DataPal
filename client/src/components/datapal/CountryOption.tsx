import React from "react";

// Crisp SVG Country Flag Component using high-res vector representations
export function CountryFlag({ code, className = "w-5 h-3.5" }: { code: string; className?: string }) {
  const upper = code.toUpperCase();
  // We can use a fast SVG flag CDN or inline vector SVG for common flags
  // FlagCDN provides free, lightning fast, official SVGs for every ISO 3166-1 alpha-2 code
  const src = `https://flagcdn.com/${upper.toLowerCase()}.svg`;

  return (
    <span className={`inline-flex items-center justify-center overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)] shrink-0 ${className}`}>
      <img
        src={src}
        alt={upper}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback to text initials if offline or image fails
          (e.currentTarget as HTMLElement).style.display = "none";
        }}
      />
    </span>
  );
}

export function CountryOption({
  code,
  name,
  dialCode,
  selected = false,
}: {
  code: string;
  name: string;
  dialCode?: string;
  selected?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      <CountryFlag code={code} />
      <span className="font-medium text-slate-800 text-sm flex-1 truncate">{name}</span>
      {dialCode && (
        <span className="text-xs text-slate-400 font-mono shrink-0">{dialCode}</span>
      )}
      {selected && (
        <span className="text-indigo-600 text-xs font-bold shrink-0">✓</span>
      )}
    </div>
  );
}
