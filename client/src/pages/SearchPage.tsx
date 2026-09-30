import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Table,
  Phone,
  Mail,
  MapPin,
  Globe,
  Bot,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Modular DataPal components
import { DataPalHeader } from "@/components/datapal/DataPalHeader";
import { SearchTabs, DataPalTab } from "@/components/datapal/SearchTabs";
import { StepContainer, StepStatus } from "@/components/datapal/StepContainer";
import { SearchInputStep, DetectedTargetType } from "@/components/datapal/SearchInputStep";
import { LocationStep } from "@/components/datapal/LocationStep";
import { ReviewGenerateCard } from "@/components/datapal/ReviewGenerateCard";
import { PitchAngleStep } from "@/components/datapal/PitchAngleStep";
import { AdvancedOptions } from "@/components/datapal/AdvancedOptions";
import { AiMatcherDrawer } from "@/components/datapal/AiMatcherDrawer";
import { AdminFeatureFlagsDrawer } from "@/components/datapal/AdminFeatureFlagsDrawer";

// Services & config
import { StructuredLocationScope, locationService } from "@/services/locationService";
import { useFeatureFlag } from "@/services/useFeatureFlag";

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // ── Navigation Tabs State ──
  const [activeTab, setActiveTab] = useState<DataPalTab>("search");

  // ── Feature Flags (All Default OFF) ──
  const [pitchAngleEnabled] = useFeatureFlag("datapal.pitchAngle.enabled");
  const [advancedRulesEnabled] = useFeatureFlag("datapal.advancedRules.enabled");
  const [aiMatcherEnabled] = useFeatureFlag("datapal.aiMatcher.enabled");

  // Admin settings drawer
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [aiMatcherDrawerOpen, setAiMatcherDrawerOpen] = useState(false);

  // ── Step 1 Form State (What) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<DetectedTargetType>(null);
  const [audienceRefine, setAudienceRefine] = useState({
    ageRange: "",
    gender: "",
    interests: "",
  });

  // ── Step 2 Form State (Where) ──
  const [locationScope, setLocationScope] = useState<StructuredLocationScope>({
    countries: ["IN"], // Default to India (can be changed to any country)
    states: "ALL",
    cities: "ALL",
    area: "",
    postalCode: "",
  });

  // ── Optional Feature States (Pitch Angle & Advanced Rules) ──
  const [pitchRequirement, setPitchRequirement] = useState("all");
  const [advancedRules, setAdvancedRules] = useState({
    requirePhone: false,
    requireEmail: false,
    requireWebsite: false,
    minRating: 0,
  });

  // ── Step Accordion / Collapse State ──
  // Track open state for Step 1, Step 2, Step 3
  const [step1Open, setStep1Open] = useState(true);
  const [step2Open, setStep2Open] = useState(true);
  const [step3Open, setStep3Open] = useState(true);

  // Error validation trigger state
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ── Search Execution & Progress State ──
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSearchLabel, setCurrentSearchLabel] = useState("");
  const [latestSearchId, setLatestSearchId] = useState<number | null>(null);

  // ── Queries for Counts & History ──
  const utils = trpc.useUtils();
  const historyQuery = trpc.scraper.getHistory.useQuery(
    { page: 1, pageSize: 20 },
    { enabled: isAuthenticated }
  );

  // Latest results query when on leads tab
  const latestResultsQuery = trpc.scraper.getResults.useQuery(
    { searchId: latestSearchId || 0, page: 1, pageSize: 50 },
    { enabled: isAuthenticated && !!latestSearchId && activeTab === "leads" }
  );

  const bulkSearchMutation = trpc.scraper.bulkSearch.useMutation();

  // ── Validation Logic ──
  const isStep1Valid = Boolean(searchQuery.trim() || selectedCategories.length > 0);
  const isStep2Valid = Boolean(locationScope.countries && locationScope.countries.length > 0);

  // Step Status derivations
  const step1Status: StepStatus = isStep1Valid
    ? "complete"
    : attemptedSubmit
    ? "error"
    : "not_started";

  const step2Status: StepStatus = isStep2Valid
    ? "complete"
    : attemptedSubmit
    ? "error"
    : "not_started";

  const step3Status: StepStatus = isStep1Valid && isStep2Valid ? "complete" : "not_started";

  // Step 1 Summary Text when collapsed
  const step1Summary = useMemo(() => {
    if (searchQuery.trim()) {
      return `Keyword: "${searchQuery}"${detectedType ? ` (${detectedType})` : ""}`;
    }
    if (selectedCategories.length > 0) {
      return `Categories: ${selectedCategories.slice(0, 3).join(", ")}${
        selectedCategories.length > 3 ? ` +${selectedCategories.length - 3} more` : ""
      }`;
    }
    return "What data do you need?";
  }, [searchQuery, selectedCategories, detectedType]);

  // Step 2 Summary Text when collapsed
  const step2Summary = useMemo(() => {
    return locationService.formatScopeDescription(locationScope);
  }, [locationScope]);

  // ── Generate Data Execution Handler ──
  const handleGenerate = async () => {
    setAttemptedSubmit(true);

    if (!isStep1Valid) {
      setStep1Open(true);
      toast.error("Please specify what data you need in Step 1");
      return;
    }

    if (!isStep2Valid) {
      setStep2Open(true);
      toast.error("Please specify at least one country in Step 2");
      return;
    }

    // Build types to search: user query + categories
    let typesToSearch: string[] = [];
    if (searchQuery.trim()) {
      typesToSearch = searchQuery.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (selectedCategories.length > 0) {
      typesToSearch = Array.from(new Set([...typesToSearch, ...selectedCategories]));
    }

    // If audience refinement was specified, append to query
    if (detectedType === "Audience") {
      const extraRefinements = [
        audienceRefine.ageRange ? `age ${audienceRefine.ageRange}` : "",
        audienceRefine.gender ? audienceRefine.gender : "",
        audienceRefine.interests ? audienceRefine.interests : "",
      ]
        .filter(Boolean)
        .join(" ");

      if (extraRefinements) {
        typesToSearch = typesToSearch.map((t) => `${t} (${extraRefinements})`);
      }
    }

    // Convert structured scope to API location string
    const apiLocationString = locationService.toApiLocationString(locationScope);
    const apiRequirement = pitchAngleEnabled ? pitchRequirement : "all";

    setIsSearching(true);
    setProgress(15);
    setCurrentSearchLabel(`Extracting data for ${locationService.formatScopeDescription(locationScope)}...`);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 3 : 90));
      }, 400);

      const bulkResult = await bulkSearchMutation.mutateAsync({
        businessTypes: typesToSearch,
        location: apiLocationString,
        requirement: apiRequirement,
      });

      clearInterval(progressInterval);
      setProgress(100);

      toast.success("Extraction complete! Found verified records.");

      if (bulkResult.searchIds && bulkResult.searchIds.length > 0) {
        const firstId = bulkResult.searchIds[0];
        setLatestSearchId(firstId);

        // Auto-export Excel report in background
        try {
          const exportData = await utils.scraper.exportAllExcel.fetch({
            searchIds: bulkResult.searchIds,
          });
          if (exportData?.base64) {
            const byteCharacters = atob(exportData.base64);
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
            a.download = exportData.filename || "DataPal_Export.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Excel report downloaded automatically!");
          }
        } catch (e) {
          console.error("Auto export error", e);
        }
      }

      // Invalidate history query to update counts
      utils.scraper.getHistory.invalidate();

      // Switch to Leads tab as per workflow spec
      setActiveTab("leads");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete data extraction");
    } finally {
      setIsSearching(false);
      setProgress(0);
      setCurrentSearchLabel("");
    }
  };

  // If user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl">
          <CardContent className="p-8 text-center">
            <Globe className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
              Sign In Required
            </h2>
            <p className="text-slate-600 mb-8 font-medium">
              Please sign in to access DataPal
            </p>
            <Button
              asChild
              className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              <a href="/">Go to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalHistoryCount = historyQuery.data?.total || historyQuery.data?.items?.length || 0;
  const totalLeadsCount = latestResultsQuery.data?.total || 0;

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)",
      }}
    >
      <div className="container py-8 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6">
        {/* ═══════════════════════════════════════════ */}
        {/* 1. HEADER */}
        {/* ═══════════════════════════════════════════ */}
        <DataPalHeader
          onOpenSettings={() => setAdminDrawerOpen(true)}
          hasActiveFlags={pitchAngleEnabled || advancedRulesEnabled || aiMatcherEnabled}
        />

        {/* ═══════════════════════════════════════════ */}
        {/* 2. TABS: Search | Leads | History */}
        {/* ═══════════════════════════════════════════ */}
        <SearchTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          leadsCount={totalLeadsCount > 0 ? totalLeadsCount : undefined}
          historyCount={totalHistoryCount > 0 ? totalHistoryCount : undefined}
        />

        {/* ═══════════════════════════════════════════ */}
        {/* TAB CONTENT: SEARCH */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Slim entry link if AI Matcher is enabled */}
            {aiMatcherEnabled && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>AI Smart Matcher is active. Analyze a website or brochure to auto-configure.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiMatcherDrawerOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 underline font-bold"
                >
                  Open Analyzer →
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────── */}
            {/* STEP 1: What data do you need? */}
            {/* ─────────────────────────────────────── */}
            <StepContainer
              stepNumber={1}
              title="What data do you need?"
              subtitle="Search anything — businesses, professionals, or groups of people"
              status={step1Status}
              summaryText={step1Summary}
              isOpen={step1Open}
              onToggle={() => setStep1Open(!step1Open)}
              errorMessage="Please enter search keywords or pick at least one category to continue."
            >
              <SearchInputStep
                query={searchQuery}
                onQueryChange={(q) => {
                  setSearchQuery(q);
                  if (attemptedSubmit && q.trim()) setAttemptedSubmit(false);
                }}
                selectedCategories={selectedCategories}
                onCategoriesChange={(cats) => {
                  setSelectedCategories(cats);
                  if (attemptedSubmit && cats.length > 0) setAttemptedSubmit(false);
                }}
                detectedType={detectedType}
                onDetectedTypeChange={setDetectedType}
                audienceRefine={audienceRefine}
                onAudienceRefineChange={setAudienceRefine}
                showError={step1Status === "error"}
              />
            </StepContainer>

            {/* ─────────────────────────────────────── */}
            {/* STEP 2: Where? */}
            {/* ─────────────────────────────────────── */}
            <StepContainer
              stepNumber={2}
              title="Where?"
              subtitle="Select Country, State, City, and optional Area or Postal Code"
              status={step2Status}
              summaryText={step2Summary}
              isOpen={step2Open}
              onToggle={() => setStep2Open(!step2Open)}
              errorMessage="Please select at least one country."
            >
              <LocationStep
                scope={locationScope}
                onChangeScope={setLocationScope}
                showError={step2Status === "error"}
              />
            </StepContainer>

            {/* Optional Step: Target Pitch Angle (When Enabled by Super Admin) */}
            {pitchAngleEnabled && (
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
                <PitchAngleStep
                  selectedRequirement={pitchRequirement}
                  onChangeRequirement={setPitchRequirement}
                />
              </div>
            )}

            {/* Optional Step: Advanced Verification Rules (When Enabled by Super Admin) */}
            {advancedRulesEnabled && (
              <AdvancedOptions
                rules={advancedRules}
                onChangeRules={setAdvancedRules}
              />
            )}

            {/* ─────────────────────────────────────── */}
            {/* STEP 3: Review and generate (Final Step) */}
            {/* ─────────────────────────────────────── */}
            <StepContainer
              stepNumber={3}
              title="Review and generate"
              subtitle="Verify your target criteria and start data generation"
              status={step3Status}
              isOpen={step3Open}
              onToggle={() => setStep3Open(!step3Open)}
            >
              <div className="space-y-4">
                <ReviewGenerateCard
                  query={searchQuery}
                  categories={selectedCategories}
                  scope={locationScope}
                  detectedType={detectedType}
                  isSearching={isSearching}
                  onGenerate={handleGenerate}
                  isStep1Valid={isStep1Valid}
                  isLocationValid={isStep2Valid}
                />

                {/* Progress bar during search execution */}
                <AnimatePresence>
                  {isSearching && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          {currentSearchLabel}
                        </span>
                        <span className="font-extrabold text-indigo-600">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StepContainer>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB CONTENT: LEADS */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "leads" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Extracted Leads</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {latestSearchId
                      ? `Viewing records for search #${latestSearchId}`
                      : "Recent lead records generated across your searches"}
                  </p>
                </div>
                {latestSearchId && (
                  <Button
                    onClick={() => navigate(`/results/${latestSearchId}`)}
                    className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                  >
                    Open Full Table View
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </div>

              {latestResultsQuery.isLoading ? (
                <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Loading lead records...
                </div>
              ) : !latestResultsQuery.data?.items?.length ? (
                <div className="py-16 text-center space-y-3">
                  <Table className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No leads generated yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Use the Search tab to specify what you need and click "Generate data" to extract verified leads.
                  </p>
                  <Button
                    onClick={() => setActiveTab("search")}
                    variant="outline"
                    className="rounded-xl text-xs font-bold"
                  >
                    Go to Search
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="pb-3 font-bold">Business / Lead</th>
                        <th className="pb-3 font-bold">Category</th>
                        <th className="pb-3 font-bold">Contact</th>
                        <th className="pb-3 font-bold">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {latestResultsQuery.data.items.slice(0, 10).map((lead: any) => (
                        <tr key={lead.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-900">{lead.name}</td>
                          <td className="py-3 text-xs text-slate-600">{lead.businessType}</td>
                          <td className="py-3 text-xs text-slate-600">
                            {lead.phone || lead.email || "—"}
                          </td>
                          <td className="py-3 text-xs text-slate-600">{lead.address || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB CONTENT: HISTORY */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Search History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Past searches and generated lead batches
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/history")}
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                >
                  View Full History
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              {historyQuery.isLoading ? (
                <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Loading history...
                </div>
              ) : !historyQuery.data?.items?.length ? (
                <div className="py-16 text-center space-y-3">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No past searches</p>
                  <Button
                    onClick={() => setActiveTab("search")}
                    variant="outline"
                    className="rounded-xl text-xs font-bold"
                  >
                    Start First Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyQuery.data.items.slice(0, 8).map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/results/${item.id}`)}
                      className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-slate-50/60 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {item.businessType}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          {item.totalResults || 0} leads
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* DRAWERS: Super Admin Flags & AI Matcher */}
      {/* ═══════════════════════════════════════════ */}
      <AdminFeatureFlagsDrawer
        isOpen={adminDrawerOpen}
        onClose={() => setAdminDrawerOpen(false)}
      />

      <AiMatcherDrawer
        isOpen={aiMatcherDrawerOpen}
        onClose={() => setAiMatcherDrawerOpen(false)}
        onApplyTarget={(targetText) => {
          setSearchQuery(targetText);
        }}
      />
    </div>
  );
}
