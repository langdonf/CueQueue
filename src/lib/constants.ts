export const FREE_TIER_LIMITS = {
  maxSetlists: 3,
} as const;

export const PRO_FEATURES = {
  liveMode: "Live Mode",
  sharing: "Sharing",
  export: "Export",
  unlimitedSetlists: "Unlimited Setlists",
} as const;

export const MUSICAL_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

export const KEY_QUALITIES = ["major", "minor"] as const;
