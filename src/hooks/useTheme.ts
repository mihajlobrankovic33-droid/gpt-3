import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("studybuddy-theme");
    // Default to dark mode for premium experience
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("studybuddy-theme", theme);
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme };
};
