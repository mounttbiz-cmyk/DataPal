import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { SearchHistory } from "@shared/schema";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Building2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
} from "lucide-react";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
  running: { icon: Loader2, color: "text-blue-500", label: "Running" },
  pending: { icon: Clock, color: "text-gray-400", label: "Pending" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

const requirementLabels: Record<string, string> = {
  "no_website": "Missing Website",
  "no_phone": "Missing Phone Number",
  "low_rating": "Low Rating",
};

export default function HistoryPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);

  const { data: history, isLoading } = trpc.scraper.getHistory.useQuery({ page, pageSize: 20 });

  const exportAllQuery = trpc.scraper.exportAllExcel.useQuery(
    undefined,
    { enabled: false, retry: false }
  );

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

  const handleExportAll = () => {
    toast.info("Preparing your full export... This may take a moment.");
    exportAllQuery.refetch().then((result) => {
      const d = result.data;
      if (d && d.base64) {
        downloadBase64(d.base64, d.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        toast.success(`✅ Exported ${d.totalSearches} searches with sheets for: ${d.businessTypes.join(", ")}`);
      } else {
        toast.error("Export failed. Please try again.");
      }
    }).catch(() => toast.error("No completed searches found to export."));
  };

  const handleViewResults = (searchId: number) => {
    navigate(`/results/${searchId}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-500 mb-6">Please sign in to view your search history</p>
            <Button asChild>
              <a href="/">Go to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full macos-glass border border-white/80 mb-6 shadow-lg shadow-indigo-500/10">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-gray-800 tracking-wide">Command Center</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 tracking-tighter">Search <span className="premium-gradient-text">History</span></h1>
              <p className="text-lg text-gray-500 font-medium">Revisit and export your generated lead campaigns.</p>
            </div>
            <Button
              onClick={handleExportAll}
              disabled={exportAllQuery.isLoading}
              className="shrink-0 h-14 px-6 text-base font-bold macos-button-primary rounded-2xl shadow-xl shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              {exportAllQuery.isLoading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 mr-3" />
              )}
              Export All to Excel
            </Button>
          </div>

          {/* History List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No searches yet</h3>
              <p className="text-muted-foreground mb-6">Start searching for businesses to see your history here</p>
              <Button asChild className="macos-button rounded-xl px-6 h-10">
                <a href="/search">Start a Search</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, i) => {
                const status = statusConfig[item.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Card className="glass-card cursor-pointer border-white/80 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group"
                      onClick={() => handleViewResults(item.id)}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                              <Building2 className="w-7 h-7 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900 truncate tracking-tight">{item.businessType}</h3>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color.replace('text-', 'bg-').replace('500', '50')} ${status.color}`}>
                                  <StatusIcon className="w-3.5 h-3.5" />
                                  {status.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {item.requirement && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                    {requirementLabels[item.requirement] || item.requirement}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {item.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  {item.resultsCount} results
                                </span>
                                <span className="text-xs text-muted-foreground/70">
                                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {item.status === "completed" && (item.resultsCount ?? 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-primary hover:text-primary-foreground hover:bg-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewResults(item.id);
                              }}
                            >
                              View
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {history && history.length >= 20 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500 px-3">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={history.length < 20}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
