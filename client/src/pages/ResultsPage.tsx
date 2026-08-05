import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useParams } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Table,
  Phone,
  Mail,
  MapPin,
  Globe,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Search,
  Briefcase,
  BarChart3,
} from "lucide-react";

const sourceColors: Record<string, string> = {
  google_maps: "bg-red-50 text-red-700 border-red-100",
  justdial: "bg-green-50 text-green-700 border-green-100",
  indiamart: "bg-orange-50 text-orange-700 border-orange-100",
  linkedin: "bg-blue-50 text-blue-700 border-blue-100",
  yellowpages: "bg-yellow-50 text-yellow-700 border-yellow-100",
  tradeindia: "bg-purple-50 text-purple-700 border-purple-100",
  other: "bg-gray-50 text-gray-700 border-gray-100",
};

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

export default function ResultsPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ searchId: string }>();
  const searchId = parseInt(params.searchId || "0");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: searchData } = trpc.scraper.getSearch.useQuery(
    { searchId },
    { enabled: !!searchId && isAuthenticated }
  );

  const { data: resultsData, isLoading } = trpc.scraper.getResults.useQuery(
    { searchId, page, pageSize },
    { enabled: !!searchId && isAuthenticated && searchData?.status === "completed" }
  );

  const excelMutation = trpc.scraper.exportExcel.useQuery(
    { searchId },
    { enabled: false, retry: false }
  );

  const csvMutation = trpc.scraper.exportCsv.useQuery(
    { searchId },
    { enabled: false, retry: false }
  );

  const handleExportExcel = () => {
    excelMutation.refetch().then((result) => {
      const d = result.data;
      if (d && d.base64) {
        downloadBase64(d.base64, d.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        toast.success(`Excel exported! ${d.phoneCount} phones, ${d.emailCount} emails`);
      }
    });
  };

  const handleExportCSV = () => {
    csvMutation.refetch().then((result) => {
      const d = result.data;
      if (d && d.base64) {
        downloadBase64(d.base64, d.filename, "text/csv");
        toast.success("CSV exported successfully!");
      }
    });
  };

  const uniqueSources = resultsData
    ? Array.from(new Set(resultsData.results.map((r) => r.source as string)))
    : [];

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-500 mb-6">Please sign in to view results</p>
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/history")}
                className="text-gray-500 hover:text-gray-900 bg-white/50 hover:bg-white macos-glass px-4 py-2 rounded-full shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {searchData?.businessType || "Results"}
                </h1>
                <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {searchData?.location}
                  <span className="text-gray-300 mx-1">|</span>
                  <BarChart3 className="w-3.5 h-3.5" />
                  {searchData?.totalCount ?? 0} businesses found
                </p>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-3 mt-6 lg:mt-0">
              <Button
                size="lg"
                onClick={handleExportExcel}
                disabled={excelMutation.isLoading}
                className="macos-button-primary rounded-xl font-bold h-12 px-6 shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
              >
                {excelMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                )}
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleExportCSV}
                disabled={csvMutation.isLoading}
                className="macos-button rounded-xl font-bold h-12 px-6 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm hover:-translate-y-0.5 transition-all"
              >
                {csvMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 mr-2" />
                )}
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {resultsData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10 bento-grid">
              {[
                { label: "Total Results", value: resultsData.total, icon: Table },
                { label: "With Phone", value: resultsData.results.filter((r) => r.phone).length, icon: Phone },
                { label: "With Email", value: resultsData.results.filter((r) => r.email).length, icon: Mail },
                { label: "Sources Used", value: uniqueSources.length, icon: Globe },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-card h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <stat.icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
                          <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Results Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : !resultsData || resultsData.results.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No results yet</h3>
                <p className="text-gray-400 mb-6">
                  {searchData?.status === "running"
                    ? "Search is still running. Please wait..."
                    : searchData?.status === "failed"
                      ? "Search failed. Please try again."
                      : "Search is pending or has no results."}
                </p>
                <Button asChild>
                  <a href="/search">Start New Search</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card overflow-hidden shadow-bento border-white/60">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white/40 backdrop-blur-md">
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">#</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Business</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Category</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Address</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Phone</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Rating</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">Status</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest px-6 py-4">AI Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white/20 backdrop-blur-sm">
                    {resultsData.results.map((biz, i) => (
                      <motion.tr
                        key={biz.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-gray-400 font-mono">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Briefcase className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{biz.name}</p>
                              {biz.website && (
                                <a
                                  href={biz.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-0.5"
                                >
                                  <Globe className="w-3 h-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.category ? (
                            <span className="text-sm text-gray-600">{biz.category}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.address ? (
                            <span className="text-sm text-gray-500 max-w-[200px] truncate block" title={biz.address}>
                              {biz.address}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.phone ? (
                            <span className="text-sm text-gray-700 font-mono">{biz.phone}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.rating ? (
                            <span className="text-sm font-semibold text-indigo-600">{biz.rating} ⭐️</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.existingPresence ? (
                            <span className="text-xs text-gray-600">{biz.existingPresence}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {biz.notes ? (
                            <span className="text-xs text-green-600 font-medium">{biz.notes}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {resultsData.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/30">
                  <span className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, resultsData.total)} of {resultsData.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500 px-2">
                      Page {page} of {resultsData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= resultsData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}
