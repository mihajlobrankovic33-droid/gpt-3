import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "install_banner_dismissed_at";

export const InstallBanner = () => {
  const { canInstall, isIOS, isStandalone, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      // Re-prompt after 24h if the user dismissed it earlier
      return Date.now() - parseInt(raw, 10) < 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });
  const [showIOSSteps, setShowIOSSteps] = useState(isIOS);

  // Android: pending install in memory
  // (no auto-show logic needed - banner only renders when canInstall or isIOS)

  // Already installed as an app - nothing to show
  if (isStandalone || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const onAndroid = canInstall && !isIOS;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 animate-slide-up">
      <div className="max-w-md mx-auto rounded-2xl bg-card border border-border shadow-strong overflow-hidden">
        {onAndroid ? (
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Instaliraj Study Buddy</p>
              <p className="text-xs text-muted-foreground truncate">
                Radi kao prava aplikacija - bez pretraživača
              </p>
            </div>
            <Button
              onClick={installApp}
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Instaliraj
            </Button>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Zatvori"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Instaliraj Study Buddy</p>
                <p className="text-xs text-muted-foreground">
                  Dodaj na početni ekran - radi kao prava aplikacija
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Zatvori"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showIOSSteps && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    1
                  </div>
                  <p className="text-sm">
                    Pritisni <Share className="w-4 h-4 inline text-primary" /> Share u Safari-ju
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    2
                  </div>
                  <p className="text-sm">Izaberi "Add to Home Screen"</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    3
                  </div>
                  <p className="text-sm">Pritisni "Add" - gotovo! 🎉</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};