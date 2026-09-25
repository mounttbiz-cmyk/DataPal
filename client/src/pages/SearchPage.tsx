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
  MapPin,
  Building2,
  Loader2,
  ArrowRight,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  CheckCheck,
  Upload,
  Bot,
  Target,
  FileSpreadsheet,
  Globe,
  Navigation,
  Compass,
  Layers,
  Filter
} from "lucide-react";
import { GLOBAL_COUNTRIES, type CountryData } from "@/config/globalLocations";
import { CATEGORY_GROUPS, ALL_SUBCATEGORIES } from "@/config/businessCategories";

const REQUIREMENTS = [
  { id: "all", label: "All Businesses", desc: "No specific requirement" },
  { id: "website", label: "Missing Website", desc: "Pitch web design or development" },
  { id: "logo", label: "Missing Logo / Branding", desc: "Pitch design & branding packages" },
  { id: "gbp", label: "Missing Google Business Profile", desc: "Pitch Local SEO services" },
  { id: "social", label: "Missing Social Media", desc: "Pitch social media management" },
  { id: "online_ordering", label: "Missing Online Ordering", desc: "Pitch booking or e-commerce systems" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // --- Category / Business Types State ---
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategoryGroupId, setSelectedCategoryGroupId] = useState<string>("all");
  const [typeSearch, setTypeSearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // --- Requirements State ---
  const [requirementText, setRequirementText] = useState("");
  const [reqDropdownOpen, setReqDropdownOpen] = useState(false);
  const reqDropdownRef = useRef<HTMLDivElement>(null);

  // --- Hierarchical Global Location State (Country -> State -> City -> Area / PIN) ---
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("US");
  const [customCountryName, setCustomCountryName] = useState<string>("");

  const [selectedStateName, setSelectedStateName] = useState<string>("California");
  const [customStateName, setCustomStateName] = useState<string>("");

  const [selectedCityName, setSelectedCityName] = useState<string>("Los Angeles");
  const [customCityName, setCustomCityName] = useState<string>("");

  const [areaPincode, setAreaPincode] = useState<string>("");

  // --- Search Execution & Progress State ---
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSearchLabel, setCurrentSearchLabel] = useState("");
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const stopProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressInterval();
  }, [stopProgressInterval]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (reqDropdownRef.current && !reqDropdownRef.current.contains(event.target as Node)) {
        setReqDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Current active country data
  const activeCountry = useMemo(() => {
    return GLOBAL_COUNTRIES.find(c => c.code === selectedCountryCode);
  }, [selectedCountryCode]);

  // Current active state list
  const availableStates = useMemo(() => {
    return activeCountry ? activeCountry.states : [];
  }, [activeCountry]);

  // Current active city list
  const availableCities = useMemo(() => {
    if (!activeCountry) return [];
    if (!selectedStateName || selectedStateName === "All States") {
      return activeCountry.states.flatMap(s => s.cities).slice(0, 15);
    }
    const stateObj = activeCountry.states.find(s => s.name === selectedStateName);
    return stateObj ? stateObj.cities : [];
  }, [activeCountry, selectedStateName]);

  // Compute final combined location string
  const resolvedCountry = selectedCountryCode === "OTHER" ? (customCountryName.trim() || "Global") : (activeCountry?.name || "Global");
  const resolvedState = selectedStateName === "CUSTOM" ? customStateName.trim() : (selectedStateName === "All States" ? "" : selectedStateName);
  const resolvedCity = selectedCityName === "CUSTOM" ? customCityName.trim() : (selectedCityName === "All Cities" ? "" : selectedCityName);
  const resolvedArea = areaPincode.trim();

  const compositeLocation = useMemo(() => {
    const parts = [
      resolvedArea,
      resolvedCity,
      resolvedState,
      resolvedCountry
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Global";
  }, [resolvedArea, resolvedCity, resolvedState, resolvedCountry]);

  // Filtered subcategories by active group & search
  const visibleSubcategories = useMemo(() => {
    let pool = ALL_SUBCATEGORIES;
    if (selectedCategoryGroupId !== "all") {
      const group = CATEGORY_GROUPS.find(g => g.id === selectedCategoryGroupId);
      if (group) pool = group.subcategories;
    }
    if (!typeSearch.trim()) return pool;
    return pool.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase()));
  }, [selectedCategoryGroupId, typeSearch]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleSelectGroup = (subcategories: string[]) => {
    const allSelected = subcategories.every(s => selectedTypes.includes(s));
    if (allSelected) {
      setSelectedTypes(prev => prev.filter(s => !subcategories.includes(s)));
    } else {
      setSelectedTypes(prev => Array.from(new Set([...prev, ...subcategories])));
    }
  };

  // Mutations
  const bulkSearchMutation = trpc.scraper.bulkSearch.useMutation();
  const utils = trpc.useUtils();

  const handleSearch = async () => {
    if (!compositeLocation.trim()) {
      toast.error("Please specify a location");
      return;
    }

    if (!requirementText.trim()) {
      toast.error("Please specify a data requirement");
      return;
    }

    const matchedReq = REQUIREMENTS.find(
      (r) => r.label.toLowerCase() === requirementText.trim().toLowerCase()
    );
    const finalRequirement = matchedReq ? matchedReq.id : requirementText.trim();

    const typesToSearch = selectedTypes.length === 0 ? visibleSubcategories.slice(0, 5) : [...selectedTypes];

    stopProgressInterval();
    setIsSearching(true);
    setProgress(15);
    setCurrentSearchLabel(`Extracting data across ${compositeLocation}...`);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : 90));
      }, 300);

      const bulkResult = await bulkSearchMutation.mutateAsync({
        businessTypes: typesToSearch,
        location: compositeLocation,
        requirement: finalRequirement,
      });

      clearInterval(interval);
      setProgress(100);

      toast.success(`Data extraction complete for ${typesToSearch.length} categories!`);

      // Auto-download compiled excel
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
    <div className="container py-8 lg:py-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl lg:text-6xl font-extrabold mb-4 tracking-tighter">
            <span className="text-slate-900">Generate </span>
            <span className="text-indigo-600">Data</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-800 max-w-2xl mx-auto font-medium">
            Configure global search parameters to extract verified business data worldwide.
          </p>
        </motion.div>

        {/* Side-by-side Grid Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-5 gap-8"
        >
          {/* AI Analyzer Block */}
          <motion.div variants={itemVariants} className="lg:col-span-2 h-full">
            <Card className="bg-white shadow-sm border border-gray-200 h-full relative overflow-hidden rounded-[2rem]">
              <CardContent className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                    <Bot className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">AI Analyzer</h2>
                    <p className="text-sm text-slate-800 font-medium">Let AI figure out who needs you.</p>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <Label className="text-sm font-bold text-slate-950 mb-2 block">Service URL or Description</Label>
                    <Input
                      placeholder="e.g. 'We build e-commerce apps'"
                      value={analyzerUrl}
                      onChange={(e) => setAnalyzerUrl(e.target.value)}
                      className="h-12 text-base rounded-xl border-gray-200 bg-white"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-800 font-bold">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-950 mb-2 block">Upload Poster / Brochure</Label>
                    <Button variant="outline" className="w-full relative h-12 justify-start font-medium text-slate-900 rounded-xl border-gray-200 bg-white hover:bg-gray-50" type="button">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImageUpload}
                      />
                      <Upload className="w-5 h-5 mr-3 text-indigo-400" />
                      {analyzerImage ? analyzerImage.name : "Choose Image to analyze"}
                    </Button>
                  </div>

                  {analyzeResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">Target Profile Set</span>
                      <p className="text-base font-bold text-slate-900">{analyzeResult}</p>
                    </motion.div>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      if (!analyzerUrl && !analyzerImage) {
                        toast.error("Please enter a URL, description, or upload an image");
                        return;
                      }
                      analyzeMutation.mutate({
                        text: analyzerUrl || undefined,
                        imageBase64: analyzerImage ? analyzerImage.base64 : undefined,
                        mimeType: analyzerImage ? analyzerImage.mime : undefined
                      });
                    }}
                    disabled={analyzeMutation.isPending}
                    className="w-full h-12 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Pitch...
                      </>
                    ) : (
                      "Set Target Profile with AI"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Configuration Block */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card className="bg-white shadow-sm border border-gray-200 relative overflow-hidden rounded-[2rem]">
              <CardContent className="p-8 relative z-10 flex flex-col justify-between min-h-[600px]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                    <Target className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Global Search Configuration</h2>
                    <p className="text-sm text-slate-800 font-medium">Configure location levels & business categories to extract data.</p>
                  </div>
                </div>

                <div className="space-y-8 flex-1">
                  {/* Data Requirement Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-950">
                      Data Requirement (Target Profile)
                    </Label>
                    <div className="relative" ref={reqDropdownRef}>
                      <div
                        className="flex items-center w-full bg-white border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl px-5 py-4 transition-all cursor-text"
                        onClick={() => setReqDropdownOpen(true)}
                      >
                        <Search className="w-5 h-5 text-indigo-400 mr-4 shrink-0" />
                        <Input
                          value={requirementText}
                          onChange={(e) => {
                            setRequirementText(e.target.value);
                            setReqDropdownOpen(true);
                          }}
                          onFocus={() => setReqDropdownOpen(true)}
                          placeholder="e.g. Missing Website, Needs SEO..."
                          className="border-0 focus-visible:ring-0 p-0 text-base font-bold text-gray-900 placeholder:font-normal placeholder:text-slate-700 bg-transparent h-auto"
                        />
                        {requirementText && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRequirementText("");
                            }}
                            className="ml-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <X className="w-5 h-5 text-slate-700" />
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {reqDropdownOpen && REQUIREMENTS.some(r =>
                          r.label.toLowerCase().includes(requirementText.toLowerCase()) ||
                          r.desc.toLowerCase().includes(requirementText.toLowerCase())
                        ) && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 w-full mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                            >
                              <div className="max-h-72 overflow-y-auto py-2">
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
                                    className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <div className="font-bold text-gray-900">{req.label}</div>
                                    <div className="text-sm text-slate-800 mt-1">{req.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* GLOBAL CASCADING LOCATION FILTER (Country -> State -> City -> Area/PIN) */}
                  {/* ======================================================== */}
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-900 text-base">Global Location Hierarchy</span>
                      </div>
                      <div className="text-xs font-semibold px-3 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-full shadow-xs truncate max-w-md">
                        {compositeLocation}
                      </div>
                    </div>

                    {/* Level 1: Country */}
                    <div className="space-y-2">
                      <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                        Select Country
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {GLOBAL_COUNTRIES.map(country => {
                          const isSelected = selectedCountryCode === country.code;
                          return (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountryCode(country.code);
                                setSelectedStateName(country.states[0]?.name || "All States");
                                setSelectedCityName(country.states[0]?.cities[0] || "All Cities");
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                                  : "bg-white text-slate-700 border-gray-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="text-lg">{country.flag}</span>
                              <span className="truncate">{country.name}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCountryCode("OTHER");
                            setSelectedStateName("CUSTOM");
                            setSelectedCityName("CUSTOM");
                          }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            selectedCountryCode === "OTHER"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-700 border-gray-200 hover:bg-slate-100"
                          }`}
                        >
                          <Compass className="w-4 h-4" />
                          <span>Other Country</span>
                        </button>
                      </div>

                      {selectedCountryCode === "OTHER" && (
                        <div className="pt-2">
                          <Input
                            placeholder="Type any country in the world (e.g. Netherlands, Japan, Brazil...)"
                            value={customCountryName}
                            onChange={(e) => setCustomCountryName(e.target.value)}
                            className="h-12 bg-white rounded-xl border-gray-300 font-medium"
                          />
                        </div>
                      )}
                    </div>

                    {/* Level 2 & 3: State & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* State / Province */}
                      <div className="space-y-2">
                        <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                          State / Province / Region
                        </Label>
                        {selectedCountryCode !== "OTHER" && availableStates.length > 0 ? (
                          <select
                            value={selectedStateName}
                            onChange={(e) => {
                              setSelectedStateName(e.target.value);
                              const stateObj = availableStates.find(s => s.name === e.target.value);
                              setSelectedCityName(stateObj?.cities[0] || "All Cities");
                            }}
                            className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
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
                            className="h-12 bg-white rounded-xl border-gray-300 font-medium"
                          />
                        )}
                        {selectedStateName === "CUSTOM" && (
                          <Input
                            placeholder="Type custom state or province"
                            value={customStateName}
                            onChange={(e) => setCustomStateName(e.target.value)}
                            className="h-11 bg-white rounded-xl border-gray-300 font-medium mt-2"
                          />
                        )}
                      </div>

                      {/* City */}
                      <div className="space-y-2">
                        <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                          City
                        </Label>
                        {selectedCountryCode !== "OTHER" && availableCities.length > 0 ? (
                          <select
                            value={selectedCityName}
                            onChange={(e) => setSelectedCityName(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                          >
                            <option value="All Cities">All Cities in Region</option>
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
                            className="h-12 bg-white rounded-xl border-gray-300 font-medium"
                          />
                        )}
                        {selectedCityName === "CUSTOM" && (
                          <Input
                            placeholder="Type custom city"
                            value={customCityName}
                            onChange={(e) => setCustomCityName(e.target.value)}
                            className="h-11 bg-white rounded-xl border-gray-300 font-medium mt-2"
                          />
                        )}
                      </div>
                    </div>

                    {/* Level 4: Area / Neighborhood & Postal Code */}
                    <div className="space-y-2">
                      <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                        Area / Locality / {activeCountry?.postalCodeLabel || "Postal / PIN Code"} (Optional)
                      </Label>
                      <div className="relative">
                        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                        <Input
                          placeholder={
                            selectedCountryCode === "IN"
                              ? "e.g. Bandra West, Connaught Place, PIN: 400050..."
                              : selectedCountryCode === "GB"
                              ? "e.g. Canary Wharf, Westminster, Postal Code: E14..."
                              : "e.g. Downtown, Beverly Hills, ZIP: 90210..."
                          }
                          value={areaPincode}
                          onChange={(e) => setAreaPincode(e.target.value)}
                          className="pl-11 h-12 bg-white rounded-xl border-gray-300 font-medium text-sm text-slate-900 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* CATEGORY-WISE BUSINESS FILTER */}
                  {/* ======================================================== */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-slate-950 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Category-Wise Business Filter
                      </Label>
                      {selectedTypes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                            {selectedTypes.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedTypes([])}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Category Group Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryGroupId("all")}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                          selectedCategoryGroupId === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                        }`}
                      >
                        All Categories
                      </button>
                      {CATEGORY_GROUPS.map(group => {
                        const isSelected = selectedCategoryGroupId === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => setSelectedCategoryGroupId(group.id)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                            }`}
                          >
                            {group.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search & Select Subcategories Dropdown Container */}
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setCategoryDropdownOpen((v) => !v)}
                        disabled={isSearching}
                        className="w-full h-16 px-5 flex items-center justify-between border border-gray-200 shadow-inner bg-white rounded-2xl text-left disabled:opacity-60 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Filter className="w-5 h-5 text-indigo-500 shrink-0" />
                          <span className="text-slate-900 font-semibold truncate text-base">
                            {selectedTypes.length === 0
                              ? `Select categories from ${selectedCategoryGroupId === "all" ? "all groups" : CATEGORY_GROUPS.find(g => g.id === selectedCategoryGroupId)?.name}...`
                              : `${selectedTypes.slice(0, 3).join(", ")}${selectedTypes.length > 3 ? ` +${selectedTypes.length - 3} more` : ""}`}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-700 shrink-0 transition-transform duration-300 ${categoryDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {categoryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 mt-3 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Search subcategory (e.g. Hospitals, Cafes, Law Firms...)"
                                  value={typeSearch}
                                  onChange={(e) => setTypeSearch(e.target.value)}
                                  className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleSelectGroup(visibleSubcategories)}
                                className="text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                              >
                                {visibleSubcategories.every(s => selectedTypes.includes(s)) ? "Deselect Group" : "Select Group"}
                              </button>
                            </div>

                            <div className="max-h-72 overflow-y-auto py-2 divide-y divide-gray-50">
                              {visibleSubcategories.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-slate-600 font-medium">No subcategories match your search.</p>
                              ) : (
                                visibleSubcategories.map((type) => {
                                  const checked = selectedTypes.includes(type);
                                  return (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => toggleType(type)}
                                      className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-indigo-50/50 transition-colors text-left"
                                    >
                                      <span className={checked ? "font-bold text-indigo-900" : "font-medium text-slate-800"}>
                                        {type}
                                      </span>
                                      {checked ? (
                                        <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                                      ) : (
                                        <Square className="w-5 h-5 text-gray-300 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">
                                {selectedTypes.length} of {ALL_SUBCATEGORIES.length} selected
                              </span>
                              <Button
                                size="sm"
                                className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl px-5"
                                onClick={() => setCategoryDropdownOpen(false)}
                              >
                                Apply Categories
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-8 mt-8 border-t border-gray-100">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        {currentSearchLabel || "Extracting Global Data..."}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-6 h-6 mr-3" />
                        Generate Data Report
                      </>
                    )}
                  </Button>

                  {/* Progress Indicator */}
                  <AnimatePresence>
                    {isSearching && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-bold">{currentSearchLabel || "Searching..."}</span>
                          <span className="font-extrabold text-indigo-600">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-gray-500 font-medium">
            Engineered for massive global data extraction across verified international directories.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
