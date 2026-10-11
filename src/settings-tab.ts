import { App, PluginSettingTab, Setting, TextComponent } from "obsidian";
import { ShortcutAction, ShortcutManager, formatShortcut, shortcutFromKeyboardEvent } from "./shortcuts";
import { CenterlineSettings, DEFAULT_SETTINGS } from "./settings";

export interface SettingsHost {
  settings: CenterlineSettings;
  shortcutManager: ShortcutManager;
  saveSettings(): Promise<void>;
  refreshEditorViews(): void;
}

class ShortcutInput {
  private composing = false;

  constructor(
    private readonly text: TextComponent,
    private readonly currentShortcut: () => string,
    private readonly onShortcut: (shortcut: string, input: ShortcutInput) => void
  ) {
    const input = text.inputEl;
    input.readOnly = true;
    input.addClass("centerline-shortcut-input");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", "快捷键");
    input.value = formatShortcut(this.currentShortcut());

    input.addEventListener("compositionstart", this.onCompositionStart);
    input.addEventListener("compositionend", this.onCompositionEnd);
    input.addEventListener("keydown", this.onKeydown);
    input.addEventListener("focus", this.onFocus);
  }

  refresh(): void {
    this.text.inputEl.value = formatShortcut(this.currentShortcut());
  }

  setRecording(recording: boolean): void {
    this.text.inputEl.classList.toggle("centerline-shortcut-recording", recording);
  }

  private onCompositionStart = (): void => {
    this.composing = true;
  };

  private onCompositionEnd = (): void => {
    this.composing = false;
  };

  private onFocus = (): void => {
    this.text.inputEl.select();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (this.composing || event.isComposing || event.key === "Process" || event.keyCode === 229) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      this.refresh();
      this.setRecording(false);
      this.text.inputEl.blur();
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      this.setRecording(true);
      return;
    }

    this.setRecording(false);
    this.onShortcut(shortcut, this);
  };
}

export class CenterlineSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly host: SettingsHost
  ) {
    super(app, host as unknown as import("obsidian").Plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Centerline" });

    containerEl.createEl("p", {
      text: "专注模式和打字机模式只作用于 Markdown 编辑器，不影响阅读模式。模式状态不会在插件重载后保留。"
    });

    this.createShortcutSetting(
      "专注模式快捷键",
      "降低其他编辑器行的透明度，当前光标所在行保持正常显示。",
      "focus"
    );

    this.createShortcutSetting(
      "打字机模式快捷键",
      "让当前光标所在行滚动到编辑区垂直中心。",
      "typewriter"
    );

    new Setting(containerEl)
      .setName("恢复默认快捷键")
      .setDesc(`专注模式 ${formatShortcut(DEFAULT_SETTINGS.focusShortcut)}，打字机模式 ${formatShortcut(DEFAULT_SETTINGS.typewriterShortcut)}`)
      .addButton((button) =>
        button.setButtonText("恢复默认").onClick(async () => {
          this.host.settings.focusShortcut = DEFAULT_SETTINGS.focusShortcut;
          this.host.settings.typewriterShortcut = DEFAULT_SETTINGS.typewriterShortcut;
          await this.host.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("专注模式透明度")
      .setDesc("数值越低，非当前行越淡；当前默认值为 42%。")
      .addSlider((slider) =>
        slider
          .setLimits(0.1, 0.9, 0.05)
          .setValue(this.host.settings.focusOpacity)
          .setDynamicTooltip()
          .onChange((value) => {
            this.host.settings.focusOpacity = value;
            this.host.refreshEditorViews();
            void this.host.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText("恢复默认").onClick(async () => {
          this.host.settings.focusOpacity = DEFAULT_SETTINGS.focusOpacity;
          this.host.refreshEditorViews();
          await this.host.saveSettings();
          this.display();
        })
      );
  }

  private createShortcutSetting(
    name: string,
    description: string,
    action: ShortcutAction
  ): void {
    const setting = new Setting(this.containerEl).setName(name).setDesc(description);
    let inputControl: ShortcutInput | null = null;

    setting.addText((text) => {
      inputControl = new ShortcutInput(
        text,
        () => this.shortcutForAction(action),
        (shortcut, input) => {
          if (!this.trySetShortcut(action, shortcut)) {
            input.refresh();
            return;
          }

          void this.host.saveSettings();
          input.refresh();
        }
      );
    });

    setting.addButton((button) =>
      button.setButtonText("恢复默认").onClick(async () => {
        const defaultShortcut =
          action === "focus"
            ? DEFAULT_SETTINGS.focusShortcut
            : DEFAULT_SETTINGS.typewriterShortcut;
        if (!this.trySetShortcut(action, defaultShortcut)) {
          inputControl?.refresh();
          return;
        }

        await this.host.saveSettings();
        inputControl?.refresh();
      })
    );
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

  private trySetShortcut(action: ShortcutAction, shortcut: string): boolean {
    if (this.host.shortcutManager.hasConflict(action, shortcut)) {
      this.host.shortcutManager.notifyConflict(action);
      return false;
    }

    this.setShortcutForAction(action, shortcut);
    return true;
  }
}
