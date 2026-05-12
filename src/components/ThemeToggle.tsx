import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-lg hover:bg-muted border border-transparent hover:border-border"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_hsl(45,100%,50%)]" />
      ) : (
        <Moon className="h-5 w-5 text-primary" />
      )}
    </Button>
  );
};
