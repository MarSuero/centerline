import {
  App,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  TextComponent
} from "obsidian";
import {
  ShortcutAction,
  ShortcutManager,
  formatShortcut,
  shortcutFromKeyboardEvent
} from "./shortcuts";
import { CenterlineSettings, DEFAULT_SETTINGS, normalizeSettings } from "./settings";

export interface SettingsHost {
  settings: CenterlineSettings;
  shortcutManager: ShortcutManager;
  saveSettings(): Promise<void>;
  refreshEditorViews(): void;
}

class ShortcutInput {
  private composing = false;
  private readonly input: HTMLInputElement;

  constructor(
    text: TextComponent,
    private readonly currentShortcut: () => string,
    private readonly onShortcut: (shortcut: string, input: ShortcutInput) => void
  ) {
    this.input = text.inputEl;
    this.input.readOnly = true;
    this.input.addClass("centerline-shortcut-input");
    this.input.setAttribute("spellcheck", "false");
    this.input.setAttribute("autocomplete", "off");
    this.input.setAttribute("aria-label", "快捷键");
    this.refresh();

    this.input.addEventListener("compositionstart", this.onCompositionStart);
    this.input.addEventListener("compositionend", this.onCompositionEnd);
    this.input.addEventListener("keydown", this.onKeydown);
    this.input.addEventListener("focus", this.onFocus);
  }

  refresh(): void {
    this.input.value = formatShortcut(this.currentShortcut());
  }

  dispose(): void {
    this.input.removeEventListener("compositionstart", this.onCompositionStart);
    this.input.removeEventListener("compositionend", this.onCompositionEnd);
    this.input.removeEventListener("keydown", this.onKeydown);
    this.input.removeEventListener("focus", this.onFocus);
  }

  private onCompositionStart = (): void => {
    this.composing = true;
  };

  private onCompositionEnd = (): void => {
    this.composing = false;
  };

  private onFocus = (): void => {
    this.input.select();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (this.composing || event.isComposing || event.key === "Process") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      this.refresh();
      this.input.blur();
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    if (shortcut) {
      this.onShortcut(shortcut, this);
    }
  };
}

export class CenterlineSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly host: SettingsHost
  ) {
    super(app, host as unknown as import("obsidian").Plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "专注模式",
        items: [
          {
            name: "非当前行透明度",
            desc: "数值越低，非当前行越淡；默认值为 42%。",
            control: {
              type: "slider",
              key: "focusOpacity",
              min: 0.1,
              max: 0.9,
              step: 0.05,
              defaultValue: DEFAULT_SETTINGS.focusOpacity,
              displayFormat: (value) => `${Math.round(value * 100)}%`
            }
          },
          {
            name: "恢复默认透明度",
            desc: "将非当前行透明度恢复为 42%。",
            action: () => {
              void this.resetFocusOpacity();
            }
          },
          {
            name: "专注模式快捷键",
            desc: "按下快捷键录入组合键。默认快捷键为 F8。",
            render: (setting) => this.renderShortcutSetting(setting, "focus")
          }
        ]
      },
      {
        type: "group",
        heading: "打字机模式",
        items: [
          {
            name: "打字机模式快捷键",
            desc: "按下快捷键录入组合键。默认快捷键为 F9。",
            render: (setting) => this.renderShortcutSetting(setting, "typewriter")
          }
        ]
      }
    ];
  }

  getControlValue(key: string): unknown {
    if (key === "focusOpacity") {
      return this.host.settings.focusOpacity;
    }

    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key !== "focusOpacity" || typeof value !== "number") {
      return;
    }

    this.host.settings.focusOpacity = normalizeSettings({
      ...this.host.settings,
      focusOpacity: value
    }).focusOpacity;
    this.host.refreshEditorViews();
    await this.host.saveSettings();
  }

  private renderShortcutSetting(setting: Setting, action: ShortcutAction): () => void {
    let shortcutInput: ShortcutInput | null = null;

    setting.addText((text) => {
      shortcutInput = new ShortcutInput(
        text,
        () => this.shortcutForAction(action),
        (shortcut, input) => {
          if (this.host.shortcutManager.hasConflict(action, shortcut)) {
            this.host.shortcutManager.notifyConflict(action);
            input.refresh();
            return;
          }

          this.setShortcutForAction(action, shortcut);
          void this.host.saveSettings();
          this.update();
        }
      );
    });

    setting.addButton((button) =>
      button
        .setButtonText("恢复默认")
        .setTooltip("恢复此模式的默认快捷键")
        .onClick(async () => {
          this.setShortcutForAction(
            action,
            action === "focus"
              ? DEFAULT_SETTINGS.focusShortcut
              : DEFAULT_SETTINGS.typewriterShortcut
          );
          await this.host.saveSettings();
          this.update();
        })
    );

    return () => shortcutInput?.dispose();
  }

  private shortcutForAction(action: ShortcutAction): string {
    return action === "focus"
      ? this.host.settings.focusShortcut
      : this.host.settings.typewriterShortcut;
  }

  private setShortcutForAction(action: ShortcutAction, shortcut: string): void {
    if (action === "focus") {
      this.host.settings.focusShortcut = shortcut;
    } else {
      this.host.settings.typewriterShortcut = shortcut;
    }
  }

  private async resetFocusOpacity(): Promise<void> {
    this.host.settings.focusOpacity = DEFAULT_SETTINGS.focusOpacity;
    this.host.refreshEditorViews();
    await this.host.saveSettings();
    this.update();
  }

}
