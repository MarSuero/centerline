import { App, Plugin, WorkspaceLeaf } from "obsidian";
import { EditorView } from "@codemirror/view";
import { createEditorExtension, EditorModeHost, refreshModesEffect } from "./editor-extension";
import { FocusModeController } from "./focus-mode";
import { ShortcutManager, ShortcutAction } from "./shortcuts";
import { DEFAULT_SETTINGS, normalizeSettings, CenterlineSettings } from "./settings";
import { CenterlineSettingTab } from "./settings-tab";
import { TypewriterModeController } from "./typewriter-mode";

export default class CenterlinePlugin extends Plugin implements EditorModeHost {
  settings: CenterlineSettings = DEFAULT_SETTINGS;
  readonly focusMode: FocusModeController;
  readonly typewriterMode: TypewriterModeController;
  readonly editorViews = new Set<EditorView>();
  readonly shortcutManager: ShortcutManager;
  private focusRibbonIcon: HTMLElement | null = null;
  private typewriterRibbonIcon: HTMLElement | null = null;

  constructor(app: App, manifest: import("obsidian").PluginManifest) {
    super(app, manifest);
    this.focusMode = new FocusModeController(() => {
      this.refreshEditorViews();
      this.refreshRibbonIcons();
    });
    this.typewriterMode = new TypewriterModeController(() => {
      this.refreshEditorViews();
      this.refreshRibbonIcons();
    });
    this.shortcutManager = new ShortcutManager(this.settings, (action) =>
      this.toggleMode(action)
    );
  }

  async onload(): Promise<void> {
    this.settings = normalizeSettings(
      (await this.loadData()) as Partial<CenterlineSettings> | null | undefined
    );
    this.shortcutManager.setSettings(this.settings);

    this.addCommand({
      id: "toggle-focus-mode",
      name: "切换专注模式",
      callback: () => this.focusMode.toggle()
    });

    this.addCommand({
      id: "toggle-typewriter-mode",
      name: "切换打字机模式",
      callback: () => this.typewriterMode.toggle()
    });

    this.focusRibbonIcon = this.addRibbonIcon(
      "eye",
      "切换专注模式",
      () => this.focusMode.toggle()
    );
    this.typewriterRibbonIcon = this.addRibbonIcon(
      "align-vertical-justify-center",
      "切换打字机模式",
      () => this.typewriterMode.toggle()
    );
    this.refreshRibbonIcons();

    this.registerEditorExtension(createEditorExtension(this));
    this.registerDomEvent(document, "keydown", this.shortcutManager.handleKeydown, {
      capture: true
    });

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.refreshEditorViews();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.refreshEditorViews(leaf);
      })
    );

    this.addSettingTab(new CenterlineSettingTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  get focusOpacity(): number {
    return this.settings.focusOpacity;
  }

  registerEditorView(view: EditorView): void {
    this.editorViews.add(view);
  }

  unregisterEditorView(view: EditorView): void {
    this.editorViews.delete(view);
  }

  private toggleMode(action: ShortcutAction): void {
    if (action === "focus") {
      this.focusMode.toggle();
    } else {
      this.typewriterMode.toggle();
    }
  }

  private refreshRibbonIcons(): void {
    this.updateRibbonIcon(this.focusRibbonIcon, this.focusMode.enabled, "专注模式");
    this.updateRibbonIcon(
      this.typewriterRibbonIcon,
      this.typewriterMode.enabled,
      "打字机模式"
    );
  }

  private updateRibbonIcon(
    icon: HTMLElement | null,
    enabled: boolean,
    label: string
  ): void {
    if (!icon) {
      return;
    }

    icon.classList.toggle("is-active", enabled);
    icon.setAttribute("aria-pressed", String(enabled));
    icon.setAttribute("aria-label", `${label}：${enabled ? "已开启" : "已关闭"}`);
    icon.setAttribute("title", `${label}：${enabled ? "已开启" : "已关闭"}`);
  }

  refreshEditorViews(_leaf?: WorkspaceLeaf | null): void {
    for (const view of this.editorViews) {
      if (view.dom.isConnected) {
        view.dispatch({
          effects: refreshModesEffect.of(null)
        });
      }
    }
  }
}
