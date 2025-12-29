import { useEffect, useState } from "react";
type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("darter-theme") as Theme;
      return stored || "dark"; // Default to dark mode
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove both classes first to prevent duplicates
    root.classList.remove("light", "dark");
    // Add the current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem("darter-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  return { theme, setTheme, toggleTheme };
}
