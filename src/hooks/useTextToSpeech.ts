import { useState, useCallback, useEffect } from "react";

export const useTextToSpeech = (voicePreference?: string[]) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const getPreferredVoice = useCallback(() => {
    // Use provided voice preference or fallback to defaults
    const preferredNames = voicePreference || [
      "Google UK English Female",
      "Google US English",
      "Samantha",
      "Karen",
      "Daniel",
      "Microsoft Zira",
      "Microsoft David",
    ];

    for (const name of preferredNames) {
      const voice = voices.find((v) => v.name.includes(name));
      if (voice) return voice;
    }

    // Fallback to first English voice
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    return englishVoice || voices[0];
  }, [voices, voicePreference]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getPreferredVoice();
      
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, getPreferredVoice]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
};
