import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Eye, Trash2, FileText, Sparkles, Shield, X, Loader2, Upload, BookOpen, ChevronDown, ChevronRight, History } from "lucide-react";
import { FullscreenModal, cleanText } from "@/components/FullscreenModal";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/context/LanguageContext";

interface PuskiceItem {
  id: string;
  title: string;
  content: string;
  subject?: string;
  created_at: string;
}

const DAILY_LIMIT = 5;

export function PuskiceSection() {
  const { isPro, isLifetimePro, user } = useSupabaseAuth();
  const { t } = useLanguage();
  const hasUnlimitedAccess = isPro;
  
  const [puskice, setPuskice] = useState<PuskiceItem[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showQuickView, setShowQuickView] = useState<PuskiceItem | null>(null);
  const [subject, setSubject] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Group puskice by subject
  const groupBySubject = (items: PuskiceItem[]): Record<string, PuskiceItem[]> => {
    return items.reduce((acc, item) => {
      const subjectName = item.subject || t.other;
      if (!acc[subjectName]) {
        acc[subjectName] = [];
      }
      acc[subjectName].push(item);
      return acc;
    }, {} as Record<string, PuskiceItem[]>);
  };

  // Compress image client-side for speed (smaller upload to AI)
  const compressImageToDataUrl = (file: File, maxSide = 1280, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const longest = Math.max(img.width, img.height);
          const scale = longest > maxSide ? maxSide / longest : 1;
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      img.src = objectUrl;
    });
  };

  // Fetch puskice from database
  const fetchPuskice = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("puskice")
      .select("id,title,content,subject,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching puskice:", error);
      return;
    }

    setPuskice(data || []);

    // Count today's creations
    const today = new Date().toISOString().split("T")[0];
    const todayItems = (data || []).filter(
      (item) => item.created_at.split("T")[0] === today
    );
    setTodayCount(todayItems.length);
  };

  useEffect(() => {
    fetchPuskice();
  }, [user]);

  const remaining = Math.max(0, DAILY_LIMIT - todayCount);

  // Group puskice by subject for history view
  const groupedPuskice = useMemo(() => groupBySubject(puskice), [puskice, t.other]);
  const sortedSubjects = useMemo(() => 
    Object.keys(groupedPuskice).sort((a, b) => a.localeCompare(b)), 
    [groupedPuskice]
  );
  
  // Track which subjects are expanded
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  
  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectName)) {
        next.delete(subjectName);
      } else {
        next.add(subjectName);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (!hasUnlimitedAccess && todayCount >= DAILY_LIMIT) {
      setShowProModal(true);
      return;
    }
    setSubject("");
    setImageUrl(undefined);
    setShowCreateModal(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageToDataUrl(file);
      setImageUrl(compressed);
    } catch {
      // Fallback to raw FileReader
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractAndSave = async () => {
    if (!subject.trim()) {
      toast({
        title: t.error,
        description: t.pleaseEnterSubject,
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl) {
      toast({
        title: t.error,
        description: t.pleaseAddImage,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t.error,
        description: t.mustBeLoggedIn,
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      // Get user's session token for authenticated API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: t.error,
          description: t.mustBeLoggedIn,
          variant: "destructive",
        });
        setIsExtracting(false);
        return;
      }

      // Call AI extraction edge function with user's JWT
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-puskica`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ imageUrl, subject: subject.trim() }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t.extractionFailed);
      }

      // Save to database with detected subject from AI
      const { error: insertError } = await supabase.from("puskice").insert({
        user_id: user.id,
        title: result.title || subject.trim(),
        content: result.content,
        subject: result.subject || subject.trim(),
      });

      if (insertError) {
        throw insertError;
      }

      await fetchPuskice();
      setSubject("");
      setImageUrl(undefined);
      setShowCreateModal(false);

      toast({
        title: t.success,
        description: t.aiExtractedInfo,
      });
    } catch (error) {
      console.error("Extraction error:", error);
      toast({
        title: t.error,
        description: error instanceof Error ? error.message : t.somethingWentWrong,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("puskice").delete().eq("id", id);

    if (error) {
      toast({
        title: t.error,
        description: t.cannotDeletePuskica,
        variant: "destructive",
      });
      return;
    }

    await fetchPuskice();
    toast({
      title: t.deleted,
      description: t.puskicaDeleted,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t.myPuskice}</h2>
        </div>
        <div className="flex items-center gap-3">
          {hasUnlimitedAccess ? (
            <span className="flex items-center gap-1 text-sm text-amber-400 font-semibold">
              <Shield className="w-4 h-4" />
              {isLifetimePro ? t.lifetimePro : "Pro"} - {t.unlimited}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t.remainingToday}: <span className="font-bold text-primary">{remaining}/5</span>
            </span>
          )}
          <Button
            onClick={handleCreate}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t.newNote}
          </Button>
        </div>
      </div>

      {/* AI Upload Section */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t.aiFastPuskica}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t.uploadImageDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t.subjectPlaceholder}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {imageUrl ? t.changeImage : t.addImage}
            </Button>
            <Button
              onClick={handleExtractAndSave}
              disabled={!subject.trim() || !imageUrl || isExtracting}
              className="gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.extracting}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.create}
                </>
              )}
            </Button>
          </div>
          {imageUrl && (
            <div className="relative mt-3">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full max-h-40 object-contain rounded-lg border border-border bg-muted/30"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => setImageUrl(undefined)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Section - Organized by Subject */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{t.historyBySubjects}</h3>
          <span className="text-sm text-muted-foreground">({puskice.length} {t.total})</span>
        </div>
        
        {puskice.length === 0 ? (
          <Card className="border-dashed border-2 border-border bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t.noPuskiceYet}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t.uploadImageForExtraction}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedSubjects.map((subjectName) => (
              <Collapsible 
                key={subjectName} 
                open={expandedSubjects.has(subjectName)}
                onOpenChange={() => toggleSubject(subjectName)}
              >
                <Card className="border-border bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{subjectName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {groupedPuskice[subjectName].length} {t.puskiceCount}
                          </p>
                        </div>
                      </div>
                      {expandedSubjects.has(subjectName) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border divide-y divide-border">
                      {groupedPuskice[subjectName].map((item) => (
                        <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-foreground text-sm mb-1 line-clamp-1">
                                {item.title}
                              </h5>
                              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                {item.content}
                              </p>
                              <span className="text-xs text-muted-foreground/70 mt-1 block">
                                {new Date(item.created_at).toLocaleDateString('sr-RS')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowQuickView(item)}
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Hidden image picker */}
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Quick View Modal - Updated Layout */}
      <FullscreenModal
        open={!!showQuickView}
        title={showQuickView?.title ?? t.puskica}
        subject={showQuickView?.subject}
        onClose={() => setShowQuickView(null)}
        footer={
          <Button variant="outline" onClick={() => setShowQuickView(null)} className="w-full">
            {t.close}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed text-base">
              {cleanText(showQuickView?.content || '')}
            </p>
          </div>
        </div>
      </FullscreenModal>
      {/* Pro Upgrade Modal */}
      <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} />
    </div>
  );
}
