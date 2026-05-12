import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Upload, Palette, RotateCcw, Check, Sparkles } from "lucide-react";
import { useCustomization, avatarThemes } from "@/context/CustomizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const CustomizationPanel = () => {
  const { settings, currentTheme, selectTheme, updateCustomAvatar, resetToDefault, getAvatarUrl } = useCustomization();
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`;

      const { data, error } = await supabase.storage
        .from("custom-avatars")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("custom-avatars")
        .getPublicUrl(data.path);

      updateCustomAvatar(urlData.publicUrl);
      toast({
        title: "Avatar updated! 🎉",
        description: "Your custom avatar is now set",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    selectTheme(themeId);
    toast({
      title: `${avatarThemes.find((t) => t.id === themeId)?.emoji} Theme Changed!`,
      description: `Switched to ${avatarThemes.find((t) => t.id === themeId)?.name}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Hidden trigger - opened programmatically from ProfileSettings */}
      <DialogTrigger asChild>
        <button className="hidden" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose Your Study Buddy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Theme Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Pick a Character & Theme
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {avatarThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all hover:scale-105 flex flex-col items-center gap-2",
                    settings.selectedThemeId === theme.id
                      ? "border-primary shadow-glow bg-primary/5"
                      : "border-border hover:border-primary/50 bg-card"
                  )}
                  style={{
                    boxShadow:
                      settings.selectedThemeId === theme.id
                        ? `0 0 20px hsl(${theme.theme.primary} / 0.3)`
                        : undefined,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden border-2 shadow-md"
                    style={{
                      borderColor: `hsl(${theme.theme.primary} / 0.3)`,
                    }}
                  >
                    <img
                      src={theme.avatar}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {theme.name}
                  </span>
                  <div className="flex gap-1">
                    <div
                      className="w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: `hsl(${theme.theme.primary})` }}
                      title="Primary color"
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: `hsl(${theme.theme.accent})` }}
                      title="Accent color"
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: `hsl(${theme.theme.background})` }}
                      title="Background color"
                    />
                  </div>
                  {settings.selectedThemeId === theme.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Current Avatar Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/20 shadow-medium">
              <img
                src={getAvatarUrl()}
                alt="Current avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {currentTheme.emoji} {currentTheme.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {settings.customAvatarUrl ? "Using custom avatar" : "Theme avatar active"}
              </p>
            </div>
          </div>

          {/* Custom Avatar Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Custom Avatar"}
            </Button>
            {settings.customAvatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateCustomAvatar(null)}
                className="w-full text-muted-foreground"
              >
                Use Theme Avatar Instead
              </Button>
            )}
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
