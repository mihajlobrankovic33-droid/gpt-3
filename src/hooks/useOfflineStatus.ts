import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "✅ Online",
        description: "Konekcija je obnovljena.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "📴 Offline",
        description: "Nema internet konekcije. Neke funkcije možda neće raditi.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  return isOnline;
};
