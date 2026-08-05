import { useState, useRef, useEffect, useCallback } from "react";
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
  Sparkles,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  CheckCheck,
  Upload,
  Image as ImageIcon,
  Bot,
  Target,
  FileSpreadsheet
} from "lucide-react";

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
  "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad",
  "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi",
  "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad",
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada",
  "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur",
  "Hubli-Dharwad", "Bareilly", "Moradabad", "Mysore", "Tiruchirappalli",
  "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem",
  "Warangal", "Thiruvananthapuram", "Noida", "Jamshedpur", "Kochi", "Dehradun",
];

const BUSINESS_TYPES = [
  "Schools", "Colleges", "Universities", "Coaching Centers", "Tuition Centers",
  "Real Estate Developers", "Builders", "Architects", "Interior Designers", "Real Estate Agents",
  "Hospitals", "Clinics", "Dental Clinics", "Pharmacies",
  "Restaurants", "Cafes", "Hotels", "Resorts",
  "Gyms & Fitness Centers", "Salons", "Spas",
  "IT & Software Companies", "Startups",
  "Manufacturing", "Logistics", "Transport",
  "Retail Stores", "E-commerce Stores",
  "Banks", "Insurance Companies", "Financial Advisors",
  "Lawyers", "Chartered Accountants", "Consulting Firms", "Marketing Agencies",
  "Wedding Planners", "Event Management",
];

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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [requirementText, setRequirementText] = useState("");
  const [reqDropdownOpen, setReqDropdownOpen] = useState(false);
  const reqDropdownRef = useRef<HTMLDivElement>(null);

  const [typeSearch, setTypeSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [location, setLocation] = useState("All India");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSearchLabel, setCurrentSearchLabel] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- AI Service Analyzer State ---
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerImage, setAnalyzerImage] = useState<{ base64: string, mime: string, name: string } | null>(null);
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
  // ----------------------------------

  const stopProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressInterval();
  }, [stopProgressInterval]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (reqDropdownRef.current && !reqDropdownRef.current.contains(event.target as Node)) {
        setReqDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTypes = BUSINESS_TYPES.filter((t) =>
    t.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const allSelected = selectedTypes.length === BUSINESS_TYPES.length;

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([...BUSINESS_TYPES]);
    }
  };

  const removeType = (type: string) => {
    setSelectedTypes((prev) => prev.filter((t) => t !== type));
  };

  const bulkSearchMutation = trpc.scraper.bulkSearch.useMutation();
  const utils = trpc.useUtils();

  function downloadBase64(base64: string, filename: string, mimeType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleSearch = async () => {
    if (!location.trim()) {
      toast.error("Please enter a location");
      return;
    }

    if (!requirementText.trim()) {
      toast.error("Please specify a lead requirement");
      return;
    }

    const matchedReq = REQUIREMENTS.find(
      (r) => r.label.toLowerCase() === requirementText.trim().toLowerCase()
    );
    const finalRequirement = matchedReq ? matchedReq.id : requirementText.trim();

    const typesToSearch = selectedTypes.length === 0 ? [...BUSINESS_TYPES] : [...selectedTypes];

    stopProgressInterval();
    setIsSearching(true);
    setProgress(15);
    setCurrentSearchLabel(`Searching for leads${finalRequirement !== 'all' ? ' with specific requirements' : ''} across ${location}...`);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : 90));
      }, 300);

      const bulkResult = await bulkSearchMutation.mutateAsync({
        businessTypes: typesToSearch,
        location: location.trim(),
        requirement: finalRequirement === "all" ? undefined : finalRequirement,
      });

      clearInterval(interval);
      setProgress(95);
      setCurrentSearchLabel("Generating your all-in-one Excel file...");

      const d = await utils.scraper.exportAllExcel.fetch({ searchIds: bulkResult.searchIds });

      setProgress(100);
      setIsSearching(false);
      setCurrentSearchLabel("");

      if (d && d.base64) {
        downloadBase64(d.base64, d.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        toast.success(`🎉 Completed! Automatic download triggered for "${d.filename}"`);
      } else {
        toast.success(`🎉 Completed search! Check your History page to download.`);
      }

      setTimeout(() => navigate("/history"), 1500);
    } catch (err: any) {
      setIsSearching(false);
      setProgress(0);
      setCurrentSearchLabel("");
      toast.error(err?.message || "Search failed. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Sign In Required</h2>
            <p className="text-slate-800 mb-8 font-medium">Please sign in to access the business scraper</p>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-gray-800 tracking-wide">Multi-Source Business Finder</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold mb-4 tracking-tighter">
            <span className="text-slate-900">Generate </span>
            <span className="text-indigo-600">Leads</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-800 max-w-2xl mx-auto font-medium">
            Configure your search parameters to extract high-quality business leads across India.
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

                  <Button
                    onClick={() => {
                      setAnalyzeResult(null);
                      analyzeMutation.mutate({ text: analyzerUrl, imageBase64: analyzerImage?.base64, mimeType: analyzerImage?.mime });
                    }}
                    disabled={analyzeMutation.isLoading || (!analyzerUrl && !analyzerImage)}
                    className="w-full bg-indigo-400 hover:bg-indigo-500 text-white font-bold h-14 mt-auto text-base rounded-2xl shadow-sm transition-all duration-300"
                  >
                    {analyzeMutation.isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Generate Strategy
                  </Button>

                  <AnimatePresence>
                    {analyzeResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="p-5 rounded-2xl bg-white border border-green-100 shadow-xl shadow-green-500/10 flex items-start gap-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Analysis Complete</h4>
                          <p className="text-sm text-slate-900 mt-1 leading-relaxed">
                            Ideal clients are likely missing: <span className="font-bold text-indigo-600">"{analyzeResult}"</span>.
                            Your search parameters have been updated automatically.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Configuration Block */}
          <motion.div variants={itemVariants} className="lg:col-span-3 h-full">
            <Card className="bg-white shadow-sm border border-gray-200 h-full rounded-[2rem]">
              <CardContent className="p-8 lg:p-10 flex flex-col h-full">

                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Target className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Search Configuration</h2>
                    <p className="text-sm text-slate-800 font-medium">Define your target audience to start scraping.</p>
                  </div>
                </div>

                <div className="space-y-8 flex-1">

                  {/* Requirement Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-950">
                      Lead Requirement (Target Profile)
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
                          className="flex-1 border-0 bg-transparent p-0 shadow-none h-auto focus-visible:ring-0 text-base font-medium text-gray-900 placeholder:text-slate-700"
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

                  {/* Location Input */}
                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-sm font-bold text-slate-950">
                      Target Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Mumbai, Delhi, All India"
                        disabled={isSearching}
                        className="pl-14 h-16 text-base font-medium text-gray-900 border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] rounded-2xl"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {["All India", "Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad"].map(city => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setLocation(city)}
                          disabled={isSearching}
                          className="text-sm font-bold px-4 py-2 rounded-xl bg-white border border-gray-200 text-slate-900 hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business Type Multi-Select */}
                  <div className="space-y-3 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-slate-950">
                        Business Types Filter (Optional)
                      </Label>
                      {selectedTypes.length > 0 && (
                        <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-slate-950 rounded-lg">
                          {selectedTypes.length} selected
                        </span>
                      )}
                    </div>

                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setDropdownOpen((v) => !v)}
                        disabled={isSearching}
                        className="w-full h-16 px-5 flex items-center justify-between border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] bg-white rounded-2xl text-left disabled:opacity-60"
                      >
                        <span className="text-slate-900 font-medium truncate text-base">
                          {selectedTypes.length === 0
                            ? "Select specific business types..."
                            : selectedTypes.length === BUSINESS_TYPES.length
                              ? "All Business Types Selected"
                              : selectedTypes.slice(0, 3).join(", ") +
                              (selectedTypes.length > 3 ? ` +${selectedTypes.length - 3} more` : "")}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-700 shrink-0 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {dropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 mt-3 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
                          >
                            <div className="p-3 border-b border-gray-100">
                              <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Search types..."
                                  value={typeSearch}
                                  onChange={(e) => setTypeSearch(e.target.value)}
                                  className="w-full pl-12 pr-4 py-3 text-base font-medium bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 placeholder:text-slate-700"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-slate-950 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
                            >
                              <CheckCheck className="w-5 h-5" />
                              {allSelected ? "Deselect All" : "✦ Select All Business Types"}
                            </button>

                            <div className="max-h-64 overflow-y-auto py-2">
                              {filteredTypes.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-slate-800 font-medium">No matches found</p>
                              ) : (
                                filteredTypes.map((type) => {
                                  const checked = selectedTypes.includes(type);
                                  return (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => toggleType(type)}
                                      className="w-full flex items-center justify-between px-5 py-3 text-base hover:bg-gray-50 transition-colors"
                                    >
                                      <span className={checked ? "font-bold text-gray-900" : "font-medium text-slate-900"}>
                                        {type}
                                      </span>
                                      {checked ? (
                                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                                      ) : (
                                        <Square className="w-5 h-5 text-gray-300" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {selectedTypes.length > 0 && (
                              <div className="p-3 border-t border-gray-100 bg-gray-50">
                                <Button
                                  size="lg"
                                  className="w-full bg-gray-900 hover:bg-black text-white font-bold rounded-xl"
                                  onClick={() => setDropdownOpen(false)}
                                >
                                  Done — {selectedTypes.length} selected
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-8 mt-auto border-t border-gray-100">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        {currentSearchLabel || "Initializing Engine..."}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-6 h-6 mr-3" />
                        Generate Lead Report
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
            Engineered for massive data extraction across India's top directories.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
