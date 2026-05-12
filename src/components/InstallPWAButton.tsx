import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    
    // Check iOS standalone mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (("standalone" in window.navigator) && (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Check if on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Show iOS install dialog
  if (isIOS) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setShowIOSDialog(true)}
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Instaliraj</span>
          <span className="xs:hidden">📲</span>
        </Button>
        
        <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Instaliraj StudyGPT</DialogTitle>
              <DialogDescription className="text-center">
                Dodaj aplikaciju na početni ekran
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4 p-3 bg-muted rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pritisni dugme Share</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Na dnu Safari-ja, pritisni <Share className="h-4 w-4 inline" />
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-muted rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Izaberi "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Skroluj dole i pronađi ovu opciju
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 bg-muted rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pritisni "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    Aplikacija će se pojaviti na početnom ekranu!
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-center text-xs text-muted-foreground">
              Nakon instalacije, otvori aplikaciju sa ikonice - nema više pretraživača! 📱
            </p>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Android/Desktop install button
  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      size="sm"
      className="gap-1.5 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
    >
      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden xs:inline">Instaliraj</span>
      <span className="xs:hidden">📲</span>
    </Button>
  );
};
