import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useCustomization } from "@/context/CustomizationContext";

interface SpeakButtonProps {
  text: string;
}

export const SpeakButton = ({ text }: SpeakButtonProps) => {
  const { currentTheme } = useCustomization();
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech(currentTheme.voicePreference);

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity"
      onClick={handleClick}
      title={isSpeaking ? "Stop speaking" : "Read aloud"}
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
};
