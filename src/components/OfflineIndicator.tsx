import { WifiOff } from "lucide-react";

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export const OfflineIndicator = ({ isOnline }: OfflineIndicatorProps) => {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 safe-area-top">
      <WifiOff className="h-3.5 w-3.5" />
      Offline režim
    </div>
  );
};
