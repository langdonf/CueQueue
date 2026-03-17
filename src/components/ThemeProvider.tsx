"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { type AccentTheme, getThemeCSSVars } from "@/lib/themes";

interface ThemeContextValue {
  theme: AccentTheme;
  setTheme: (theme: AccentTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "warm",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeVars(theme: AccentTheme) {
  const vars = getThemeCSSVars(theme);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({
  initialTheme = "warm",
  children,
}: {
  initialTheme?: AccentTheme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<AccentTheme>(initialTheme);

  const setTheme = useCallback((newTheme: AccentTheme) => {
    setThemeState(newTheme);
    applyThemeVars(newTheme);
  }, []);

  // Apply on mount and when initialTheme changes (e.g. after server revalidation)
  useEffect(() => {
    applyThemeVars(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
