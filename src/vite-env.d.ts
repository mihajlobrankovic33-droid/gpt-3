/// <reference types="vite/client" />

declare module "virtual:pwa-register" {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (
      swUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  };

  /** Returns an update function. Call update(true) to apply and reload. */
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => void;
}

