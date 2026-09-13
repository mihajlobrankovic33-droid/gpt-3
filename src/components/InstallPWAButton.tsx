import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export const InstallPWAButton = () => {
  const { canInstall, isIOS, isStandalone, installApp } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  // Don't show if already installed as an app
  if (isStandalone) {
    return null;
  }

  // iOS has no native install prompt; show the 3-step guide
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
              <DialogTitle className="text-center text-xl">Instaliraj Study Buddy</DialogTitle>
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

  // Android/Desktop: show only when Chrome offers installation
  if (!canInstall) {
    return null;
  }

  return (
    <Button
      onClick={installApp}
      size="sm"
      className="gap-1.5 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
    >
      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden xs:inline">Instaliraj</span>
      <span className="xs:hidden">📲</span>
    </Button>
  );
};