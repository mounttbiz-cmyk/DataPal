import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Search,
  Building2,
  Loader2,
  X,
  Upload,
  Bot,
  FileSpreadsheet,
  Globe,
  Navigation,
  MapPin,
  Sparkles,
  ChevronDown,
  Zap,
  ArrowRight,
} from "lucide-react";
import { GLOBAL_COUNTRIES, type CountryData } from "@/config/globalLocations";

const REQUIREMENTS = [
  { id: "all", label: "All Businesses", desc: "No specific requirement filter" },
  { id: "website", label: "Missing Website", desc: "Pitch web design or development" },
  { id: "logo", label: "Missing Logo / Branding", desc: "Pitch design & branding packages" },
  { id: "gbp", label: "Missing Google Business Profile", desc: "Pitch Local SEO services" },
  { id: "social", label: "Missing Social Media", desc: "Pitch social media management" },
  { id: "online_ordering", label: "Missing Online Ordering", desc: "Pitch booking or e-commerce systems" },
];

// Popular search suggestions for the free-form input
const POPULAR_SEARCHES = [
  "Restaurants", "Cafes", "Gyms", "Salons", "Hotels",
  "Hospitals", "Dentists", "Schools", "Real Estate",
  "Lawyers", "Stationery Shops", "Supermarkets",
  "Car Repair", "Pharmacies", "Pet Stores",
];

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // --- Free-form search input ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // --- Requirements State ---
  const [requirementText, setRequirementText] = useState("");
  const [reqDropdownOpen, setReqDropdownOpen] = useState(false);
  const reqDropdownRef = useRef<HTMLDivElement>(null);

  // --- Location State ---
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("IN");
  const [customCountryName, setCustomCountryName] = useState<string>("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedStateName, setSelectedStateName] = useState<string>("Maharashtra");
  const [customStateName, setCustomStateName] = useState<string>("");

  const [selectedCityName, setSelectedCityName] = useState<string>("Mumbai");
  const [customCityName, setCustomCityName] = useState<string>("");

  const [areaPincode, setAreaPincode] = useState<string>("");

  // --- Search Execution & Progress State ---
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSearchLabel, setCurrentSearchLabel] = useState("");

  // --- AI Service Analyzer State ---
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerImage, setAnalyzerImage] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);

  const analyzeMutation = trpc.scraper.analyzeProviderService.useMutation({
    onSuccess: (data) => {
      setRequirementText(data.requirement);
      setAnalyzeResult(data.requirement);
      setAnalyzerUrl("");
      setAnalyzerImage(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze service");
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const [header, base64] = dataUrl.split(",");
      const mime = header.split(":")[1].split(";")[0];
      setAnalyzerImage({ base64, mime, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (reqDropdownRef.current && !reqDropdownRef.current.contains(event.target as Node)) {
        setReqDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Current active country data
  const activeCountry = useMemo(() => {
    return GLOBAL_COUNTRIES.find(c => c.code === selectedCountryCode);
  }, [selectedCountryCode]);

  const availableStates = useMemo(() => {
    return activeCountry ? activeCountry.states : [];
  }, [activeCountry]);

  const availableCities = useMemo(() => {
    if (!activeCountry) return [];
    if (!selectedStateName || selectedStateName === "All States") {
      return activeCountry.states.flatMap(s => s.cities).slice(0, 15);
    }
    const stateObj = activeCountry.states.find(s => s.name === selectedStateName);
    return stateObj ? stateObj.cities : [];
  }, [activeCountry, selectedStateName]);

  const resolvedCountry = selectedCountryCode === "OTHER" ? (customCountryName.trim() || "Global") : (activeCountry?.name || "Global");
  const resolvedState = selectedStateName === "CUSTOM" ? customStateName.trim() : (selectedStateName === "All States" ? "" : selectedStateName);
  const resolvedCity = selectedCityName === "CUSTOM" ? customCityName.trim() : (selectedCityName === "All Cities" ? "" : selectedCityName);
  const resolvedArea = areaPincode.trim();

  const compositeLocation = useMemo(() => {
    const parts = [resolvedArea, resolvedCity, resolvedState, resolvedCountry].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Global";
  }, [resolvedArea, resolvedCity, resolvedState, resolvedCountry]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_SEARCHES;
    return POPULAR_SEARCHES.filter(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Mutations
  const bulkSearchMutation = trpc.scraper.bulkSearch.useMutation();
  const utils = trpc.useUtils();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter what you want to search for");
      return;
    }
    if (!compositeLocation.trim()) {
      toast.error("Please specify a location");
      return;
    }

    const matchedReq = REQUIREMENTS.find(
      (r) => r.label.toLowerCase() === requirementText.trim().toLowerCase()
    );
    const finalRequirement = matchedReq ? matchedReq.id : (requirementText.trim() || "all");

    // Split by commas if user entered multiple types
    const typesToSearch = searchQuery.split(",").map(s => s.trim()).filter(Boolean);

    setIsSearching(true);
    setProgress(15);
    setCurrentSearchLabel(`Searching "${searchQuery}" in ${compositeLocation}...`);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 3 : 90));
      }, 400);

      const bulkResult = await bulkSearchMutation.mutateAsync({
        businessTypes: typesToSearch,
        location: compositeLocation,
        requirement: finalRequirement,
      });

      clearInterval(interval);
      setProgress(100);

      toast.success(`Found real business data for "${searchQuery}"!`);

      // Auto-download excel
      try {
        const d = await utils.scraper.exportAllExcel.fetch({ searchIds: bulkResult.searchIds });
        if (d?.base64) {
          const byteCharacters = atob(d.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = d.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast.success("Excel report downloaded automatically!");
        }
      } catch (e) {
        console.error("Auto export error", e);
      }

      navigate(`/history`);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete search");
    } finally {
      setIsSearching(false);
      setProgress(0);
      setCurrentSearchLabel("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Sign In Required</h2>
            <p className="text-slate-800 mb-8 font-medium">Please sign in to access DataPal</p>
            <Button asChild className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <a href="/">Go to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)" }}>
      <div className="container py-10 lg:py-16">
        <div className="max-w-6xl mx-auto">

          {/* ═══════════════════════════════════════════ */}
          {/* HEADER */}
          {/* ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-5 tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5" />
              Powered by Real-Time APIs
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3 tracking-tight text-slate-900">
              Search <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Anything</span>
            </h1>
            <p className="text-base lg:text-lg text-slate-500 max-w-xl mx-auto font-medium">
              Stationery shops, restaurants, entrepreneurs, DMart — search any business in any city worldwide.
            </p>
          </motion.div>

          {/* ═══════════════════════════════════════════ */}
          {/* MAIN SEARCH BAR — Hero-style */}
          {/* ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div
              ref={searchInputRef}
              className="relative"
            >
              <div
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-lg shadow-indigo-500/5 px-5 py-3 transition-all focus-within:border-indigo-400 focus-within:shadow-indigo-500/10 focus-within:shadow-xl"
                onClick={() => setShowSuggestions(true)}
              >
                <Search className="w-5 h-5 text-indigo-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search anything... e.g. Stationery shops, DMart, Gyms, Gen Z cafes, Entrepreneurs"
                  className="flex-1 text-base font-semibold text-gray-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none py-2"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shrink-0"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Search
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-gray-100">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        {searchQuery.trim() ? "Matching suggestions" : "Popular searches"}
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {filteredSuggestions.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-slate-500">
                          No suggestions — press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Search</kbd> to find "{searchQuery}" directly
                        </div>
                      ) : (
                        filteredSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-indigo-50/60 transition-colors flex items-center gap-3"
                          >
                            <Search className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-sm font-medium text-slate-700">{suggestion}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-5 py-2.5 border-t border-gray-100 bg-slate-50">
                      <p className="text-[11px] text-slate-400 font-medium">
                        💡 Tip: Type anything freely — "DMart near me", "Gen Z cafes", "stationery shops", etc.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════ */}
          {/* TWO-COLUMN LAYOUT: Location + AI Analyzer */}
          {/* ═══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Location Configuration (2/3 width) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                {/* Location Header */}
                <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-200">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Location</h2>
                      <p className="text-xs text-slate-400 font-medium">Where to search</p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 max-w-[220px] truncate">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {compositeLocation}
                  </div>
                </div>

                <div className="p-7 space-y-6">
                  {/* Country Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-extrabold">1</span>
                      Country
                    </Label>
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setCountryDropdownOpen(v => !v)}
                        className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          {selectedCountryCode !== "OTHER" && activeCountry ? (
                            <>
                              <span className="text-xl">{activeCountry.flag}</span>
                              <span className="font-semibold text-slate-800 text-sm">{activeCountry.name}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-5 h-5 text-slate-400" />
                              <span className="font-semibold text-slate-800 text-sm">
                                {customCountryName || "Select a country..."}
                              </span>
                            </>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {countryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
                          >
                            <div className="max-h-72 overflow-y-auto py-1">
                              {GLOBAL_COUNTRIES.map(country => (
                                <button
                                  key={country.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountryCode(country.code);
                                    setSelectedStateName(country.states[0]?.name || "All States");
                                    setSelectedCityName(country.states[0]?.cities[0] || "All Cities");
                                    setCountryDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-indigo-50 transition-colors text-left ${
                                    selectedCountryCode === country.code ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700"
                                  }`}
                                >
                                  <span className="text-lg">{country.flag}</span>
                                  <span className="font-medium">{country.name}</span>
                                  {selectedCountryCode === country.code && (
                                    <span className="ml-auto text-indigo-500 text-xs font-bold">Selected</span>
                                  )}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCountryCode("OTHER");
                                  setSelectedStateName("CUSTOM");
                                  setSelectedCityName("CUSTOM");
                                  setCountryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-indigo-50 transition-colors text-left border-t border-gray-100 ${
                                  selectedCountryCode === "OTHER" ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700"
                                }`}
                              >
                                <Globe className="w-5 h-5 text-slate-400" />
                                <span className="font-medium">Other Country (type manually)</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {selectedCountryCode === "OTHER" && (
                      <Input
                        placeholder="Type country name (e.g. Netherlands, Japan, Brazil...)"
                        value={customCountryName}
                        onChange={(e) => setCustomCountryName(e.target.value)}
                        className="h-11 bg-white rounded-xl border-gray-200 font-medium mt-2"
                      />
                    )}
                  </div>

                  {/* State & City — side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* State */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-extrabold">2</span>
                        State / Region
                      </Label>
                      {selectedCountryCode !== "OTHER" && availableStates.length > 0 ? (
                        <select
                          value={selectedStateName}
                          onChange={(e) => {
                            setSelectedStateName(e.target.value);
                            const stateObj = availableStates.find(s => s.name === e.target.value);
                            setSelectedCityName(stateObj?.cities[0] || "All Cities");
                          }}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 text-sm appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
                        >
                          <option value="All States">All States / Nationwide</option>
                          {availableStates.map(state => (
                            <option key={state.name} value={state.name}>{state.name}</option>
                          ))}
                          <option value="CUSTOM">+ Custom State...</option>
                        </select>
                      ) : (
                        <Input
                          placeholder="Enter state or region"
                          value={customStateName}
                          onChange={(e) => setCustomStateName(e.target.value)}
                          className="h-12 bg-white rounded-xl border-gray-200 font-medium"
                        />
                      )}
                      {selectedStateName === "CUSTOM" && (
                        <Input
                          placeholder="Type custom state"
                          value={customStateName}
                          onChange={(e) => setCustomStateName(e.target.value)}
                          className="h-11 bg-white rounded-xl border-gray-200 font-medium mt-2"
                        />
                      )}
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-extrabold">3</span>
                        City
                      </Label>
                      {selectedCountryCode !== "OTHER" && availableCities.length > 0 ? (
                        <select
                          value={selectedCityName}
                          onChange={(e) => setSelectedCityName(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 text-sm appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
                        >
                          <option value="All Cities">All Cities</option>
                          {availableCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                          <option value="CUSTOM">+ Custom City...</option>
                        </select>
                      ) : (
                        <Input
                          placeholder="Enter city name"
                          value={customCityName}
                          onChange={(e) => setCustomCityName(e.target.value)}
                          className="h-12 bg-white rounded-xl border-gray-200 font-medium"
                        />
                      )}
                      {selectedCityName === "CUSTOM" && (
                        <Input
                          placeholder="Type custom city"
                          value={customCityName}
                          onChange={(e) => setCustomCityName(e.target.value)}
                          className="h-11 bg-white rounded-xl border-gray-200 font-medium mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Area / PIN */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-slate-300 text-white flex items-center justify-center text-[10px] font-extrabold">4</span>
                      Area / Locality / {activeCountry?.postalCodeLabel || "Postal Code"}
                      <span className="text-slate-300 font-normal normal-case tracking-normal ml-1">(optional)</span>
                    </Label>
                    <div className="relative">
                      <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                      <Input
                        placeholder={
                          selectedCountryCode === "IN"
                            ? "e.g. Bandra West, MG Road, PIN: 400050..."
                            : selectedCountryCode === "GB"
                            ? "e.g. Canary Wharf, Westminster, E14..."
                            : "e.g. Downtown, Beverly Hills, ZIP: 90210..."
                        }
                        value={areaPincode}
                        onChange={(e) => setAreaPincode(e.target.value)}
                        className="pl-11 h-12 bg-white rounded-xl border-gray-200 font-medium text-sm text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Data Requirement */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Filter by Requirement
                      <span className="text-slate-300 font-normal normal-case tracking-normal ml-1">(optional)</span>
                    </Label>
                    <div className="relative" ref={reqDropdownRef}>
                      <div
                        className="flex items-center w-full bg-white border border-gray-200 rounded-xl px-4 py-3 transition-all cursor-text hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10"
                        onClick={() => setReqDropdownOpen(true)}
                      >
                        <Sparkles className="w-4 h-4 text-indigo-400 mr-3 shrink-0" />
                        <Input
                          value={requirementText}
                          onChange={(e) => {
                            setRequirementText(e.target.value);
                            setReqDropdownOpen(true);
                          }}
                          onFocus={() => setReqDropdownOpen(true)}
                          placeholder="e.g. Missing Website, Needs SEO, No Social Media..."
                          className="border-0 focus-visible:ring-0 p-0 text-sm font-medium text-gray-800 placeholder:text-slate-400 bg-transparent h-auto"
                        />
                        {requirementText && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRequirementText(""); }}
                            className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {reqDropdownOpen && REQUIREMENTS.some(r =>
                          r.label.toLowerCase().includes(requirementText.toLowerCase()) ||
                          r.desc.toLowerCase().includes(requirementText.toLowerCase())
                        ) && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                          >
                            <div className="max-h-56 overflow-y-auto py-1">
                              {REQUIREMENTS.filter(r =>
                                r.label.toLowerCase().includes(requirementText.toLowerCase()) ||
                                r.desc.toLowerCase().includes(requirementText.toLowerCase())
                              ).map((req) => (
                                <button
                                  key={req.id}
                                  type="button"
                                  onClick={() => {
                                    setRequirementText(req.label);
                                    setReqDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-5 py-3 hover:bg-indigo-50/60 transition-colors"
                                >
                                  <div className="font-semibold text-gray-800 text-sm">{req.label}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">{req.desc}</div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {currentSearchLabel || "Extracting Data..."}
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-5 h-5 mr-2" />
                          Generate Data Report
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    {/* Progress bar */}
                    <AnimatePresence>
                      {isSearching && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">{currentSearchLabel || "Searching..."}</span>
                            <span className="font-bold text-indigo-600">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── RIGHT: AI Analyzer (1/3 width) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden h-full">
                {/* AI Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-purple-200">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">AI Analyzer</h2>
                      <p className="text-xs text-slate-400 font-medium">Auto-detect target profile</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Service URL or Description</Label>
                    <Input
                      placeholder="e.g. 'We build e-commerce apps'"
                      value={analyzerUrl}
                      onChange={(e) => setAnalyzerUrl(e.target.value)}
                      className="h-11 text-sm rounded-xl border-gray-200 bg-white"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-100" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-300 font-bold text-[10px]">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Upload Poster / Brochure</Label>
                    <Button variant="outline" className="w-full relative h-11 justify-start font-medium text-slate-600 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-sm" type="button">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImageUpload}
                      />
                      <Upload className="w-4 h-4 mr-2 text-indigo-400" />
                      {analyzerImage ? analyzerImage.name : "Choose image..."}
                    </Button>
                  </div>

                  {analyzeResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 block mb-1">Target Set</span>
                      <p className="text-sm font-bold text-slate-800">{analyzeResult}</p>
                    </motion.div>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      if (!analyzerUrl && !analyzerImage) {
                        toast.error("Enter a URL/description or upload an image");
                        return;
                      }
                      analyzeMutation.mutate({
                        text: analyzerUrl || undefined,
                        imageBase64: analyzerImage ? analyzerImage.base64 : undefined,
                        mimeType: analyzerImage ? analyzerImage.mime : undefined
                      });
                    }}
                    disabled={analyzeMutation.isPending}
                    className="w-full h-11 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Detect Target Profile
                      </>
                    )}
                  </Button>

                  {/* Info card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mt-2">
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      <strong className="text-slate-500">How it works:</strong> Paste your service website or upload a brochure. AI will analyze it and auto-set the requirement filter to find businesses that need your services.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center"
          >
            <p className="text-xs text-slate-400 font-medium">
              Data sourced from Foursquare Places, OpenStreetMap & Nominatim — real verified business data worldwide.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
