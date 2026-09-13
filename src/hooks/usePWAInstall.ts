import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let promptAvailable = false;
let appInstalled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (("standalone" in window.navigator) && (window.navigator as any).standalone === true)
  );
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Register global listeners once, share the state across all components.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    promptAvailable = true;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    sharedDeferredPrompt = null;
    promptAvailable = false;
    appInstalled = true;
    emit();
  });
}

export interface PWAInstallState {
  /** Deferred install event is available (Android/Desktop Chrome) */
  canInstall: boolean;
  /** On iOS, there is no deferred prompt, but we can still guide the user */
  isIOS: boolean;
  /** Whether the app is running in standalone mode (already installed) */
  isStandalone: boolean;
  /** Whether the app has ever been installed in this session */
  installedRecently: boolean;
  /** Trigger the native install prompt (Android/Desktop). Returns true if the app got installed. */
  installApp: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [state, setState] = useState(() => ({
    canInstall: promptAvailable && !appInstalled && !isStandaloneMode(),
    isIOS: isIOSDevice(),
    isStandalone: isStandaloneMode(),
    installedRecently: appInstalled,
  }));

  useEffect(() => {
    const update = () => {
      setState((prev) => ({
        ...prev,
        canInstall: promptAvailable && !appInstalled && !isStandaloneMode(),
        isStandalone: isStandaloneMode(),
        installedRecently: appInstalled,
      }));
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const installApp = useCallback(async () => {
    const prompt = sharedDeferredPrompt;
    if (!prompt) return false;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    sharedDeferredPrompt = null;
    if (outcome === "accepted") {
      promptAvailable = false;
      appInstalled = true;
    }
    emit();

    return outcome === "accepted";
  }, []);

  return {
    ...state,
    installApp,
  };
}