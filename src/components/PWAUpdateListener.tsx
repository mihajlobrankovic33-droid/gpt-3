import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

/**
 * Ensures the installed (PWA) app checks for new versions frequently and applies updates.
 * Note: The first update still requires the app to load the new bundle at least once.
 */
export function PWAUpdateListener() {
  const { toast } = useToast();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, r) {
        registration = r;
      },
      onNeedRefresh() {
        // Auto-apply update (and also show a toast in case reload is blocked).
        toast({
          title: "Nova verzija je dostupna",
          description: "Aplikacija se ažurira…",
          action: (
            <ToastAction altText="Osveži" onClick={() => updateSW(true)}>
              Osveži
            </ToastAction>
          ),
          duration: 10000,
        });

        updateSW(true);

        // iOS standalone can be stubborn; force a reload shortly after.
        window.setTimeout(() => {
          try {
            window.location.reload();
          } catch {
            // noop
          }
        }, 800);
      },
    });

    const interval = window.setInterval(() => {
      registration?.update().catch(() => {});
    }, 20_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [toast]);

  return null;
}
