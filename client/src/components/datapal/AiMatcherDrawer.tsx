import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, Sparkles, Upload, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiMatcherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTarget: (targetText: string) => void;
}

export function AiMatcherDrawer({ isOpen, onClose, onApplyTarget }: AiMatcherDrawerProps) {
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerImage, setAnalyzerImage] = useState<{ base64: string; mime: string; name: string } | null>(null);

  const analyzeMutation = trpc.scraper.analyzeProviderService.useMutation({
    onSuccess: (data) => {
      onApplyTarget(data.requirement);
      toast.success("AI detected target service: " + data.requirement);
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze service");
    },
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

  const handleAnalyze = () => {
    if (!analyzerUrl && !analyzerImage) {
      toast.error("Enter a URL or upload a brochure image");
      return;
    }
    analyzeMutation.mutate({
      text: analyzerUrl || undefined,
      imageBase64: analyzerImage ? analyzerImage.base64 : undefined,
      mimeType: analyzerImage ? analyzerImage.mime : undefined,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6 bg-white z-[60]">
        <SheetHeader className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <Bot className="w-5 h-5" />
          </div>
          <SheetTitle className="text-xl font-bold text-slate-900">
            AI Smart Matcher & Analyzer
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Paste your company/service website or brochure. AI will determine the ideal audience and pitch angle.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
              Service URL or Pitch Description
            </Label>
            <Input
              placeholder="e.g. 'https://myagency.com' or 'We build custom Shopify stores'"
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
            <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
              Upload Brochure / Service Flyer
            </Label>
            <Button
              variant="outline"
              className="w-full relative h-11 justify-start font-medium text-slate-600 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-sm"
              type="button"
            >
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImageUpload}
              />
              <Upload className="w-4 h-4 mr-2 text-indigo-400" />
              {analyzerImage ? analyzerImage.name : "Choose flyer image..."}
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full h-12 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Service Profile...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze & Auto-Apply
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
