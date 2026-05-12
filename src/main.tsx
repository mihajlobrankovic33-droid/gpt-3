import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./App.css";

// Theme bootstrapping (runs before React renders)
const THEME_KEY = "studybuddy-theme";
const THEME_MIGRATION_KEY = "studybuddy-theme-migrated-midnight";

if (!localStorage.getItem(THEME_MIGRATION_KEY)) {
  localStorage.setItem(THEME_KEY, "dark");
  localStorage.setItem(THEME_MIGRATION_KEY, "1");
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme !== "light") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
