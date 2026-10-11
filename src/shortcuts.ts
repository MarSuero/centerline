import { Notice } from "obsidian";
import { CenterlineSettings } from "./settings";

export type ShortcutAction = "focus" | "typewriter";

const MAC_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/i;

function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && MAC_PLATFORM_PATTERN.test(navigator.platform);
}

function keyNameFromEvent(event: KeyboardEvent): string | null {
  const code = event.code;
  const key = event.key;

  if (code.startsWith("Key")) {
    return code.slice(3).toUpperCase();
  }

  if (code.startsWith("Digit")) {
    return code.slice(5);
  }

  if (code.startsWith("Numpad")) {
    return code.slice(6);
  }

  if (key === " ") {
    return "Space";
  }

  if (key === "Esc") {
    return "Escape";
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key || null;
}

function isModifierKey(key: string): boolean {
  return key === "Shift" || key === "Control" || key === "Alt" || key === "Meta";
}

function modifierNames(event: KeyboardEvent): string[] {
  const modifiers: string[] = [];
  const mac = isMacPlatform();

  if (mac) {
    if (event.metaKey) {
      modifiers.push("Mod");
    }
    if (event.ctrlKey) {
      modifiers.push("Ctrl");
    }
  } else {
    if (event.ctrlKey) {
      modifiers.push("Mod");
    }
    if (event.metaKey) {
      modifiers.push("Meta");
    }
  }

  if (event.altKey) {
    modifiers.push("Alt");
  }

  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  return modifiers;
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  const key = keyNameFromEvent(event);
  if (!key || isModifierKey(key)) {
    return null;
  }

  return [...modifierNames(event), key].join("+");
}

function canonicalPart(part: string): string {
  const aliases: Record<string, string> = {
    Cmd: "Mod",
    Command: "Mod",
    Control: "Ctrl",
    Esc: "Escape",
    Option: "Alt"
  };

  return aliases[part] ?? part;
}

export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut
    .split("+")
    .map((part) => canonicalPart(part.trim()))
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "";
  }

  const key = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1));
  const orderedModifiers = ["Mod", "Ctrl", "Alt", "Shift", "Meta"].filter((part) =>
    modifiers.has(part)
  );

  return [...orderedModifiers, key].join("+");
}

export function formatShortcut(shortcut: string): string {
  const normalized = normalizeShortcut(shortcut);
  if (!isMacPlatform()) {
    return normalized;
  }

  const labels: Record<string, string> = {
    Mod: "⌘",
    Ctrl: "⌃",
    Alt: "⌥",
    Shift: "⇧",
    Meta: "⌘"
  };

  return normalized
    .split("+")
    .map((part) => labels[part] ?? part)
    .join("");
}

export function shortcutLabel(action: ShortcutAction): string {
  return action === "focus" ? "专注模式" : "打字机模式";
}

export class ShortcutManager {
  private settings: CenterlineSettings;

  constructor(
    settings: CenterlineSettings,
    private readonly onToggle: (action: ShortcutAction) => void
  ) {
    this.settings = settings;
  }

  setSettings(settings: CenterlineSettings): void {
    this.settings = settings;
  }

  handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.key === "Process") {
      return;
    }

    if (
      event.target instanceof HTMLInputElement &&
      event.target.classList.contains("centerline-shortcut-input")
    ) {
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      return;
    }

    const normalized = normalizeShortcut(shortcut);
    const action = this.actionForShortcut(normalized);
    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.onToggle(action);
  };

  actionForShortcut(shortcut: string): ShortcutAction | null {
    const normalized = normalizeShortcut(shortcut);

    if (normalizeShortcut(this.settings.focusShortcut) === normalized) {
      return "focus";
    }

    if (normalizeShortcut(this.settings.typewriterShortcut) === normalized) {
      return "typewriter";
    }

    return null;
  }

  hasConflict(action: ShortcutAction, shortcut: string): boolean {
    const otherShortcut =
      action === "focus" ? this.settings.typewriterShortcut : this.settings.focusShortcut;

    return normalizeShortcut(shortcut) === normalizeShortcut(otherShortcut);
  }

  notifyConflict(action: ShortcutAction): void {
    new Notice(`${shortcutLabel(action)}快捷键与另一模式冲突，未保存`);
  }
}
