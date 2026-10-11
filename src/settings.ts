export interface CenterlineSettings {
  focusShortcut: string;
  typewriterShortcut: string;
  focusOpacity: number;
}

export const DEFAULT_SETTINGS: CenterlineSettings = {
  focusShortcut: "F8",
  typewriterShortcut: "F9",
  focusOpacity: 0.42
};

export function normalizeSettings(
  data: Partial<CenterlineSettings> | null | undefined
): CenterlineSettings {
  const focusOpacity =
    typeof data?.focusOpacity === "number" && Number.isFinite(data.focusOpacity)
      ? Math.min(0.9, Math.max(0.1, data.focusOpacity))
      : DEFAULT_SETTINGS.focusOpacity;

  return {
    focusShortcut:
      typeof data?.focusShortcut === "string" && data.focusShortcut.length > 0
        ? data.focusShortcut
        : DEFAULT_SETTINGS.focusShortcut,
    typewriterShortcut:
      typeof data?.typewriterShortcut === "string" && data.typewriterShortcut.length > 0
        ? data.typewriterShortcut
        : DEFAULT_SETTINGS.typewriterShortcut,
    focusOpacity
  };
}
