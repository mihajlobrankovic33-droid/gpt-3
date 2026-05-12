import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import rabbitAvatar from "@/assets/rabbit-avatar.png";
import owlAvatar from "@/assets/owl-avatar.png";
import foxAvatar from "@/assets/fox-avatar.png";
import pandaAvatar from "@/assets/panda-avatar.png";
import catAvatar from "@/assets/cat-avatar.png";
import penguinAvatar from "@/assets/penguin-avatar.png";

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  cardBackground: string;
}

export interface AvatarTheme {
  id: string;
  name: string;
  appName: string;
  appTagline: string;
  avatar: string;
  emoji: string;
  voicePreference: string[];
  theme: ThemeColors;
}

export const avatarThemes: AvatarTheme[] = [
  {
    id: "rabbit",
    name: "Bunny Scholar",
    appName: "StudyBunny",
    appTagline: "Your Hopping Study Buddy 🐇",
    avatar: rabbitAvatar,
    emoji: "🐰",
    voicePreference: ["Google UK English Female", "Samantha", "Karen", "Microsoft Zira"],
    theme: {
      primary: "174 58% 42%",
      accent: "15 85% 60%",
      background: "40 33% 98%",
      cardBackground: "0 0% 100%",
    },
  },
  {
    id: "owl",
    name: "Wise Owl",
    appName: "WiseOwl",
    appTagline: "Wisdom at Night 🌙",
    avatar: owlAvatar,
    emoji: "🦉",
    voicePreference: ["Google UK English Male", "Daniel", "Microsoft David", "Alex"],
    theme: {
      primary: "270 60% 55%",
      accent: "280 70% 65%",
      background: "270 40% 97%",
      cardBackground: "270 30% 99%",
    },
  },
  {
    id: "fox",
    name: "Clever Fox",
    appName: "FoxBrain",
    appTagline: "Quick & Clever Learning 🦊",
    avatar: foxAvatar,
    emoji: "🦊",
    voicePreference: ["Google US English", "Fred", "Microsoft Mark", "Tom"],
    theme: {
      primary: "25 90% 50%",
      accent: "35 95% 55%",
      background: "35 60% 96%",
      cardBackground: "30 50% 99%",
    },
  },
  {
    id: "panda",
    name: "Zen Panda",
    appName: "PandaLearn",
    appTagline: "Calm & Focused Study 🎋",
    avatar: pandaAvatar,
    emoji: "🐼",
    voicePreference: ["Samantha", "Google UK English Female", "Karen", "Moira"],
    theme: {
      primary: "160 50% 45%",
      accent: "140 40% 50%",
      background: "150 40% 96%",
      cardBackground: "150 30% 99%",
    },
  },
  {
    id: "cat",
    name: "Curious Cat",
    appName: "CatScholar",
    appTagline: "Curiosity Leads to Knowledge 🐾",
    avatar: catAvatar,
    emoji: "🐱",
    voicePreference: ["Victoria", "Google UK English Female", "Fiona", "Tessa"],
    theme: {
      primary: "340 65% 55%",
      accent: "350 70% 60%",
      background: "350 50% 97%",
      cardBackground: "345 40% 99%",
    },
  },
  {
    id: "penguin",
    name: "Cool Penguin",
    appName: "PenguinAI",
    appTagline: "Cool & Collected Learning 🧊",
    avatar: penguinAvatar,
    emoji: "🐧",
    voicePreference: ["Google US English", "Alex", "Microsoft David", "Daniel"],
    theme: {
      primary: "200 80% 50%",
      accent: "210 85% 55%",
      background: "200 60% 96%",
      cardBackground: "200 40% 99%",
    },
  },
];

export interface CustomizationSettings {
  selectedThemeId: string;
  customAvatarUrl: string | null;
}

interface CustomizationContextType {
  settings: CustomizationSettings;
  currentTheme: AvatarTheme;
  selectTheme: (themeId: string) => void;
  updateCustomAvatar: (url: string | null) => void;
  resetToDefault: () => void;
  getAvatarUrl: () => string;
}

const defaultSettings: CustomizationSettings = {
  selectedThemeId: "rabbit",
  customAvatarUrl: null,
};

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export const useCustomization = () => {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error("useCustomization must be used within CustomizationProvider");
  }
  return context;
};

export const CustomizationProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    const saved = localStorage.getItem("studygpt-customization-v2");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const currentTheme = avatarThemes.find((t) => t.id === settings.selectedThemeId) || avatarThemes[0];

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDarkMode(el.classList.contains("dark"));
    });

    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem("studygpt-customization-v2", JSON.stringify(settings));

    const root = document.documentElement;
    root.style.setProperty("--primary", currentTheme.theme.primary);
    root.style.setProperty("--accent", currentTheme.theme.accent);
    root.style.setProperty("--ring", currentTheme.theme.primary);

    if (isDarkMode) {
      root.style.removeProperty("--background");
      root.style.removeProperty("--card");
    } else {
      root.style.setProperty("--background", currentTheme.theme.background);
      root.style.setProperty("--card", currentTheme.theme.cardBackground);
    }

    document.body.style.background = "";
  }, [settings, currentTheme, isDarkMode]);

  const selectTheme = (themeId: string) => {
    setSettings((prev) => ({
      ...prev,
      selectedThemeId: themeId,
      customAvatarUrl: null,
    }));
  };

  const updateCustomAvatar = (url: string | null) => {
    setSettings((prev) => ({
      ...prev,
      customAvatarUrl: url,
    }));
  };

  const resetToDefault = () => {
    setSettings(defaultSettings);
  };

  const getAvatarUrl = () => {
    return settings.customAvatarUrl || currentTheme.avatar;
  };

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        currentTheme,
        selectTheme,
        updateCustomAvatar,
        resetToDefault,
        getAvatarUrl,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
};
