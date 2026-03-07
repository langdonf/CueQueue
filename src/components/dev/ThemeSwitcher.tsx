"use client";

import { useState, useEffect } from "react";

interface ThemeDefinition {
  name: string;
  label: string;
  colors: Record<string, string>;
}

const THEMES: ThemeDefinition[] = [
  {
    name: "orange",
    label: "🟠 Sunset Orange (default)",
    colors: {
      "--color-background": "#09090b",
      "--color-foreground": "#fafafa",
      "--color-muted": "#27272a",
      "--color-muted-foreground": "#a1a1aa",
      "--color-border": "#27272a",
      "--color-input": "#27272a",
      "--color-primary": "#f97316",
      "--color-primary-foreground": "#09090b",
      "--color-secondary": "#18181b",
      "--color-secondary-foreground": "#fafafa",
      "--color-accent": "#18181b",
      "--color-accent-foreground": "#fafafa",
      "--color-destructive": "#ef4444",
      "--color-card": "#0a0a0c",
      "--color-card-foreground": "#fafafa",
    },
  },
  {
    name: "violet",
    label: "🟣 Electric Violet",
    colors: {
      "--color-background": "#09090b",
      "--color-foreground": "#f0f0f5",
      "--color-muted": "#242429",
      "--color-muted-foreground": "#9090a0",
      "--color-border": "#2a2a30",
      "--color-input": "#2a2a30",
      "--color-primary": "#8b5cf6",
      "--color-primary-foreground": "#ffffff",
      "--color-secondary": "#16161a",
      "--color-secondary-foreground": "#f0f0f5",
      "--color-accent": "#16161a",
      "--color-accent-foreground": "#f0f0f5",
      "--color-destructive": "#ef4444",
      "--color-card": "#0f0f12",
      "--color-card-foreground": "#f0f0f5",
    },
  },
  {
    name: "cyan",
    label: "🔵 Cyan Stage",
    colors: {
      "--color-background": "#080b0f",
      "--color-foreground": "#e6edf3",
      "--color-muted": "#21262d",
      "--color-muted-foreground": "#8b949e",
      "--color-border": "#30363d",
      "--color-input": "#30363d",
      "--color-primary": "#22d3ee",
      "--color-primary-foreground": "#080b0f",
      "--color-secondary": "#161b22",
      "--color-secondary-foreground": "#e6edf3",
      "--color-accent": "#161b22",
      "--color-accent-foreground": "#e6edf3",
      "--color-destructive": "#f85149",
      "--color-card": "#0d1117",
      "--color-card-foreground": "#e6edf3",
    },
  },
  {
    name: "green",
    label: "🟢 Neon Green",
    colors: {
      "--color-background": "#080a08",
      "--color-foreground": "#e8f0e8",
      "--color-muted": "#1e231e",
      "--color-muted-foreground": "#8a9e8a",
      "--color-border": "#2a302a",
      "--color-input": "#2a302a",
      "--color-primary": "#4ade80",
      "--color-primary-foreground": "#080a08",
      "--color-secondary": "#141914",
      "--color-secondary-foreground": "#e8f0e8",
      "--color-accent": "#141914",
      "--color-accent-foreground": "#e8f0e8",
      "--color-destructive": "#f87171",
      "--color-card": "#0c0f0c",
      "--color-card-foreground": "#e8f0e8",
    },
  },
];

const STORAGE_KEY = "setlist-theme";

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.colors)) {
    root.style.setProperty(prop, value);
  }
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState("orange");
  const [open, setOpen] = useState(false);

  // On mount, restore saved theme
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const theme = THEMES.find((t) => t.name === saved);
      if (theme) {
        setCurrent(saved);
        applyTheme(theme);
      }
    }
  }, []);

  function handleSelect(theme: ThemeDefinition) {
    setCurrent(theme.name);
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme.name);
    setOpen(false);
  }

  const currentTheme = THEMES.find((t) => t.name === current)!;
  const primaryColor = currentTheme.colors["--color-primary"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-card hover:bg-muted transition-colors"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="text-muted-foreground">Theme</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[220px] bg-card border border-border rounded-lg shadow-lg py-1">
            {THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleSelect(theme)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-muted transition-colors ${
                  current === theme.name
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                  style={{ backgroundColor: theme.colors["--color-primary"] }}
                />
                <span className="flex-1">{theme.label}</span>
                {current === theme.name && (
                  <span className="text-xs text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
