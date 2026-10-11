var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CenterlinePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/editor-extension.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var refreshModesEffect = import_state.StateEffect.define();
function hasRefreshEffect(update) {
  return update.transactions.some(
    (transaction) => transaction.effects.some((effect) => effect.is(refreshModesEffect))
  );
}
var CenterlineEditorView = class {
  constructor(host, view) {
    this.host = host;
    this.view = view;
    this.decorations = import_view.Decoration.none;
    this.scrollFrame = null;
    this.scrollAnimationFrame = null;
    this.scrollAnimationToken = 0;
    this.host.registerEditorView(view);
    this.syncClassesAndDecorations();
    this.scheduleScroll(true);
  }
  update(update) {
    const shouldSync = hasRefreshEffect(update) || update.selectionSet || update.docChanged || update.focusChanged;
    if (shouldSync) {
      this.syncClassesAndDecorations();
    }
    if (this.host.typewriterMode.enabled && (hasRefreshEffect(update) || update.selectionSet || update.docChanged || update.focusChanged)) {
      this.scheduleScroll(hasRefreshEffect(update));
    }
  }
  destroy() {
    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }
    this.cancelScrollAnimation();
    this.host.unregisterEditorView(this.view);
  }
  syncClassesAndDecorations() {
    const focusEnabled = this.host.focusMode.enabled;
    const typewriterEnabled = this.host.typewriterMode.enabled;
    this.view.dom.classList.toggle("centerline-mode-focus", focusEnabled);
    this.view.dom.classList.toggle("centerline-mode-typewriter", typewriterEnabled);
    this.view.dom.style.setProperty(
      "--centerline-mode-focus-opacity",
      String(this.host.focusOpacity)
    );
    if (!typewriterEnabled) {
      this.cancelScrollAnimation();
    }
    if (!focusEnabled) {
      this.decorations = import_view.Decoration.none;
      return;
    }
    const activeLine = this.view.state.doc.lineAt(this.view.state.selection.main.head);
    this.decorations = import_view.Decoration.set([
      import_view.Decoration.line({
        attributes: {
          class: "centerline-mode-focus-active"
        }
      }).range(activeLine.from)
    ]);
  }
  scheduleScroll(force) {
    if (!this.host.typewriterMode.enabled) {
      return;
    }
    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
    }
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      if (!this.host.typewriterMode.enabled || !this.view.dom.isConnected) {
        return;
      }
      const position = this.view.state.selection.main.head;
      if (!force && this.isPositionNearCenter(position)) {
        return;
      }
      this.scrollPositionToCenter(position);
    });
  }
  scrollPositionToCenter(position) {
    const coordinates = this.view.coordsAtPos(position);
    if (!coordinates) {
      return;
    }
    const scroller = this.view.scrollDOM;
    const scrollerRect = scroller.getBoundingClientRect();
    const positionCenter = (coordinates.top + coordinates.bottom) / 2;
    const scrollerCenter = (scrollerRect.top + scrollerRect.bottom) / 2;
    const targetTop = scroller.scrollTop + positionCenter - scrollerCenter;
    const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const clampedTop = Math.max(0, Math.min(targetTop, maxScrollTop));
    if (Math.abs(clampedTop - scroller.scrollTop) < 1) {
      return;
    }
    this.animateScrollTo(clampedTop);
  }
  animateScrollTo(targetTop) {
    this.cancelScrollAnimation();
    const scroller = this.view.scrollDOM;
    const startTop = scroller.scrollTop;
    const distance = targetTop - startTop;
    const duration = Math.min(280, Math.max(160, Math.abs(distance) * 0.45));
    const startedAt = performance.now();
    const token = this.scrollAnimationToken;
    const step = (now) => {
      if (token !== this.scrollAnimationToken || !this.view.dom.isConnected) {
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      scroller.scrollTop = startTop + distance * easedProgress;
      if (progress < 1) {
        this.scrollAnimationFrame = window.requestAnimationFrame(step);
      } else {
        this.scrollAnimationFrame = null;
      }
    };
    this.scrollAnimationFrame = window.requestAnimationFrame(step);
  }
  cancelScrollAnimation() {
    this.scrollAnimationToken += 1;
    if (this.scrollAnimationFrame !== null) {
      window.cancelAnimationFrame(this.scrollAnimationFrame);
      this.scrollAnimationFrame = null;
    }
  }
  isPositionNearCenter(position) {
    const coordinates = this.view.coordsAtPos(position);
    if (!coordinates) {
      return false;
    }
    const scrollerRect = this.view.scrollDOM.getBoundingClientRect();
    const positionCenter = (coordinates.top + coordinates.bottom) / 2;
    const scrollerCenter = (scrollerRect.top + scrollerRect.bottom) / 2;
    return Math.abs(positionCenter - scrollerCenter) < 8;
  }
};
function createEditorExtension(host) {
  return import_view.ViewPlugin.fromClass(
    class extends CenterlineEditorView {
      constructor(view) {
        super(host, view);
      }
    },
    {
      decorations: (value) => value.decorations
    }
  );
}

// src/focus-mode.ts
var FocusModeController = class {
  constructor(onChange) {
    this.onChange = onChange;
    this.enabled = false;
  }
  toggle() {
    this.setEnabled(!this.enabled);
  }
  setEnabled(enabled) {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.onChange();
  }
};

// src/shortcuts.ts
var import_obsidian = require("obsidian");
var MAC_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/i;
function isMacPlatform() {
  return typeof navigator !== "undefined" && MAC_PLATFORM_PATTERN.test(navigator.platform);
}
function keyNameFromEvent(event) {
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
function isModifierKey(key) {
  return key === "Shift" || key === "Control" || key === "Alt" || key === "Meta";
}
function modifierNames(event) {
  const modifiers = [];
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
function shortcutFromKeyboardEvent(event) {
  const key = keyNameFromEvent(event);
  if (!key || isModifierKey(key)) {
    return null;
  }
  return [...modifierNames(event), key].join("+");
}
function canonicalPart(part) {
  var _a;
  const aliases = {
    Cmd: "Mod",
    Command: "Mod",
    Control: "Ctrl",
    Esc: "Escape",
    Option: "Alt"
  };
  return (_a = aliases[part]) != null ? _a : part;
}
function normalizeShortcut(shortcut) {
  const parts = shortcut.split("+").map((part) => canonicalPart(part.trim())).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "";
  }
  const key = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1));
  const orderedModifiers = ["Mod", "Ctrl", "Alt", "Shift", "Meta"].filter(
    (part) => modifiers.has(part)
  );
  return [...orderedModifiers, key].join("+");
}
function formatShortcut(shortcut) {
  const normalized = normalizeShortcut(shortcut);
  if (!isMacPlatform()) {
    return normalized;
  }
  const labels = {
    Mod: "\u2318",
    Ctrl: "\u2303",
    Alt: "\u2325",
    Shift: "\u21E7",
    Meta: "\u2318"
  };
  return normalized.split("+").map((part) => {
    var _a;
    return (_a = labels[part]) != null ? _a : part;
  }).join("");
}
function shortcutLabel(action) {
  return action === "focus" ? "\u4E13\u6CE8\u6A21\u5F0F" : "\u6253\u5B57\u673A\u6A21\u5F0F";
}
var ShortcutManager = class {
  constructor(settings, onToggle) {
    this.onToggle = onToggle;
    this.handleKeydown = (event) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.key === "Process") {
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.classList.contains("centerline-shortcut-input")) {
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
    this.settings = settings;
  }
  setSettings(settings) {
    this.settings = settings;
  }
  actionForShortcut(shortcut) {
    const normalized = normalizeShortcut(shortcut);
    if (normalizeShortcut(this.settings.focusShortcut) === normalized) {
      return "focus";
    }
    if (normalizeShortcut(this.settings.typewriterShortcut) === normalized) {
      return "typewriter";
    }
    return null;
  }
  hasConflict(action, shortcut) {
    const otherShortcut = action === "focus" ? this.settings.typewriterShortcut : this.settings.focusShortcut;
    return normalizeShortcut(shortcut) === normalizeShortcut(otherShortcut);
  }
  notifyConflict(action) {
    new import_obsidian.Notice(`${shortcutLabel(action)}\u5FEB\u6377\u952E\u4E0E\u53E6\u4E00\u6A21\u5F0F\u51B2\u7A81\uFF0C\u672A\u4FDD\u5B58`);
  }
};

// src/settings.ts
var DEFAULT_SETTINGS = {
  focusShortcut: "F8",
  typewriterShortcut: "F9",
  focusOpacity: 0.42
};
function normalizeSettings(data) {
  const focusOpacity = typeof (data == null ? void 0 : data.focusOpacity) === "number" && Number.isFinite(data.focusOpacity) ? Math.min(0.9, Math.max(0.1, data.focusOpacity)) : DEFAULT_SETTINGS.focusOpacity;
  return {
    focusShortcut: typeof (data == null ? void 0 : data.focusShortcut) === "string" && data.focusShortcut.length > 0 ? data.focusShortcut : DEFAULT_SETTINGS.focusShortcut,
    typewriterShortcut: typeof (data == null ? void 0 : data.typewriterShortcut) === "string" && data.typewriterShortcut.length > 0 ? data.typewriterShortcut : DEFAULT_SETTINGS.typewriterShortcut,
    focusOpacity
  };
}

// src/settings-tab.ts
var import_obsidian2 = require("obsidian");
var ShortcutInput = class {
  constructor(text, currentShortcut, onShortcut) {
    this.text = text;
    this.currentShortcut = currentShortcut;
    this.onShortcut = onShortcut;
    this.composing = false;
    this.onCompositionStart = () => {
      this.composing = true;
    };
    this.onCompositionEnd = () => {
      this.composing = false;
    };
    this.onFocus = () => {
      this.text.inputEl.select();
    };
    this.onKeydown = (event) => {
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
    const input = text.inputEl;
    input.readOnly = true;
    input.addClass("centerline-shortcut-input");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", "\u5FEB\u6377\u952E");
    input.value = formatShortcut(this.currentShortcut());
    input.addEventListener("compositionstart", this.onCompositionStart);
    input.addEventListener("compositionend", this.onCompositionEnd);
    input.addEventListener("keydown", this.onKeydown);
    input.addEventListener("focus", this.onFocus);
  }
  refresh() {
    this.text.inputEl.value = formatShortcut(this.currentShortcut());
  }
  setRecording(recording) {
    this.text.inputEl.classList.toggle("centerline-shortcut-recording", recording);
  }
};
var CenterlineSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, host) {
    super(app, host);
    this.host = host;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Centerline" });
    containerEl.createEl("p", {
      text: "\u4E13\u6CE8\u6A21\u5F0F\u548C\u6253\u5B57\u673A\u6A21\u5F0F\u53EA\u4F5C\u7528\u4E8E Markdown \u7F16\u8F91\u5668\uFF0C\u4E0D\u5F71\u54CD\u9605\u8BFB\u6A21\u5F0F\u3002\u6A21\u5F0F\u72B6\u6001\u4E0D\u4F1A\u5728\u63D2\u4EF6\u91CD\u8F7D\u540E\u4FDD\u7559\u3002"
    });
    this.createShortcutSetting(
      "\u4E13\u6CE8\u6A21\u5F0F\u5FEB\u6377\u952E",
      "\u964D\u4F4E\u5176\u4ED6\u7F16\u8F91\u5668\u884C\u7684\u900F\u660E\u5EA6\uFF0C\u5F53\u524D\u5149\u6807\u6240\u5728\u884C\u4FDD\u6301\u6B63\u5E38\u663E\u793A\u3002",
      "focus"
    );
    this.createShortcutSetting(
      "\u6253\u5B57\u673A\u6A21\u5F0F\u5FEB\u6377\u952E",
      "\u8BA9\u5F53\u524D\u5149\u6807\u6240\u5728\u884C\u6EDA\u52A8\u5230\u7F16\u8F91\u533A\u5782\u76F4\u4E2D\u5FC3\u3002",
      "typewriter"
    );
    new import_obsidian2.Setting(containerEl).setName("\u6062\u590D\u9ED8\u8BA4\u5FEB\u6377\u952E").setDesc(`\u4E13\u6CE8\u6A21\u5F0F ${formatShortcut(DEFAULT_SETTINGS.focusShortcut)}\uFF0C\u6253\u5B57\u673A\u6A21\u5F0F ${formatShortcut(DEFAULT_SETTINGS.typewriterShortcut)}`).addButton(
      (button) => button.setButtonText("\u6062\u590D\u9ED8\u8BA4").onClick(async () => {
        this.host.settings.focusShortcut = DEFAULT_SETTINGS.focusShortcut;
        this.host.settings.typewriterShortcut = DEFAULT_SETTINGS.typewriterShortcut;
        await this.host.saveSettings();
        this.display();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("\u4E13\u6CE8\u6A21\u5F0F\u900F\u660E\u5EA6").setDesc("\u6570\u503C\u8D8A\u4F4E\uFF0C\u975E\u5F53\u524D\u884C\u8D8A\u6DE1\uFF1B\u5F53\u524D\u9ED8\u8BA4\u503C\u4E3A 42%\u3002").addSlider(
      (slider) => slider.setLimits(0.1, 0.9, 0.05).setValue(this.host.settings.focusOpacity).setDynamicTooltip().onChange((value) => {
        this.host.settings.focusOpacity = value;
        this.host.refreshEditorViews();
        void this.host.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("\u6062\u590D\u9ED8\u8BA4").onClick(async () => {
        this.host.settings.focusOpacity = DEFAULT_SETTINGS.focusOpacity;
        this.host.refreshEditorViews();
        await this.host.saveSettings();
        this.display();
      })
    );
  }
  createShortcutSetting(name, description, action) {
    const setting = new import_obsidian2.Setting(this.containerEl).setName(name).setDesc(description);
    let inputControl = null;
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
    setting.addButton(
      (button) => button.setButtonText("\u6062\u590D\u9ED8\u8BA4").onClick(async () => {
        const defaultShortcut = action === "focus" ? DEFAULT_SETTINGS.focusShortcut : DEFAULT_SETTINGS.typewriterShortcut;
        if (!this.trySetShortcut(action, defaultShortcut)) {
          inputControl == null ? void 0 : inputControl.refresh();
          return;
        }
        await this.host.saveSettings();
        inputControl == null ? void 0 : inputControl.refresh();
      })
    );
  }
  shortcutForAction(action) {
    return action === "focus" ? this.host.settings.focusShortcut : this.host.settings.typewriterShortcut;
  }
  setShortcutForAction(action, shortcut) {
    if (action === "focus") {
      this.host.settings.focusShortcut = shortcut;
    } else {
      this.host.settings.typewriterShortcut = shortcut;
    }
  }
  trySetShortcut(action, shortcut) {
    if (this.host.shortcutManager.hasConflict(action, shortcut)) {
      this.host.shortcutManager.notifyConflict(action);
      return false;
    }
    this.setShortcutForAction(action, shortcut);
    return true;
  }
};

// src/typewriter-mode.ts
var TypewriterModeController = class {
  constructor(onChange) {
    this.onChange = onChange;
    this.enabled = false;
  }
  toggle() {
    this.setEnabled(!this.enabled);
  }
  setEnabled(enabled) {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.onChange();
  }
};

// src/main.ts
var CenterlinePlugin = class extends import_obsidian3.Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = DEFAULT_SETTINGS;
    this.editorViews = /* @__PURE__ */ new Set();
    this.focusMode = new FocusModeController(() => this.refreshEditorViews());
    this.typewriterMode = new TypewriterModeController(() => this.refreshEditorViews());
    this.shortcutManager = new ShortcutManager(
      this.settings,
      (action) => this.toggleMode(action)
    );
  }
  async onload() {
    this.settings = normalizeSettings(
      await this.loadData()
    );
    this.shortcutManager.setSettings(this.settings);
    this.addCommand({
      id: "toggle-focus-mode",
      name: "\u5207\u6362\u4E13\u6CE8\u6A21\u5F0F",
      callback: () => this.focusMode.toggle()
    });
    this.addCommand({
      id: "toggle-typewriter-mode",
      name: "\u5207\u6362\u6253\u5B57\u673A\u6A21\u5F0F",
      callback: () => this.typewriterMode.toggle()
    });
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
  async saveSettings() {
    await this.saveData(this.settings);
  }
  get focusOpacity() {
    return this.settings.focusOpacity;
  }
  registerEditorView(view) {
    this.editorViews.add(view);
  }
  unregisterEditorView(view) {
    this.editorViews.delete(view);
  }
  toggleMode(action) {
    if (action === "focus") {
      this.focusMode.toggle();
    } else {
      this.typewriterMode.toggle();
    }
  }
  refreshEditorViews(_leaf) {
    for (const view of this.editorViews) {
      if (view.dom.isConnected) {
        view.dispatch({
          effects: refreshModesEffect.of(null)
        });
      }
    }
  }
};
