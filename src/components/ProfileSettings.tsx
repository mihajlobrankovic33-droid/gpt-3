import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera, User, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettings = ({ isOpen, onClose }: ProfileSettingsProps) => {
  const { user, profile, refreshProfile } = useSupabaseAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    toast({ title: "Provera ažuriranja…", description: "Molimo sačekaj." });

    try {
      // Try to update the service worker registration
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations && registrations.length > 0) {
        await Promise.all(registrations.map((r) => r.update()));
      }

      // After a short delay, force a full page reload (bypass cache)
      await new Promise((r) => setTimeout(r, 600));
      window.location.reload();
    } catch (err) {
      toast({
        title: "Greška",
        description: "Nije moguće proveriti ažuriranje. Probaj ponovo.",
        variant: "destructive",
      });
      setIsCheckingUpdate(false);
    }
  }, [toast]);

  if (!isOpen || !user) return null;

  const currentAvatarUrl =
    avatarUrl ?? profile?.avatar_url ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Greška", description: "Samo slike su dozvoljene.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Greška", description: "Maksimalna veličina je 2MB.", variant: "destructive" });
      return;
    }

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let uploadedAvatarUrl: string | null = null;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("custom-avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("custom-avatars")
          .getPublicUrl(filePath);

        uploadedAvatarUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
      }

      // Update profile
      const updateData: { display_name: string | null; avatar_url?: string } = {
        display_name: displayName.trim() || null,
      };

      if (uploadedAvatarUrl) {
        updateData.avatar_url = uploadedAvatarUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await refreshProfile();

      toast({ title: "Uspeh", description: "Profil je sačuvan." });
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Došlo je do nepoznate greške.";
      toast({ title: "Greška", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-bold text-foreground">Uredi profil</h2>

        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={currentAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Klikni za promenu avatara</p>
        </div>

        {/* Display Name */}
        <div className="mb-6 space-y-2">
          <Label htmlFor="displayName">Ime za prikaz</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tvoje ime"
              className="h-12 bg-background pl-10"
              maxLength={50}
            />
          </div>
        </div>

        {/* Check for Updates */}
        <div className="mb-6">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdate}
          >
            {isCheckingUpdate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Proveri ažuriranje
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Ručno osvežava aplikaciju i učitava najnoviju verziju.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
            Otkaži
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Čuvam...
              </>
            ) : (
              "Sačuvaj"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
