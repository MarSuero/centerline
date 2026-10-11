import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Extension, StateEffect } from "@codemirror/state";
import { FocusModeController } from "./focus-mode";
import { TypewriterModeController } from "./typewriter-mode";

export const refreshModesEffect = StateEffect.define<null>();

export interface EditorModeHost {
  readonly focusMode: FocusModeController;
  readonly typewriterMode: TypewriterModeController;
  readonly focusOpacity: number;
  registerEditorView(view: EditorView): void;
  unregisterEditorView(view: EditorView): void;
}

function hasRefreshEffect(update: ViewUpdate): boolean {
  return update.transactions.some((transaction) =>
    transaction.effects.some((effect) => effect.is(refreshModesEffect))
  );
}

class CenterlineEditorView {
  decorations: DecorationSet = Decoration.none;
  private scrollFrame: number | null = null;
  private scrollAnimationFrame: number | null = null;
  private scrollAnimationToken = 0;

  constructor(
    private readonly host: EditorModeHost,
    private readonly view: EditorView
  ) {
    this.host.registerEditorView(view);
    this.syncClassesAndDecorations();
    this.scheduleScroll(true);
  }

  update(update: ViewUpdate): void {
    const shouldSync =
      hasRefreshEffect(update) ||
      update.selectionSet ||
      update.docChanged ||
      update.focusChanged;

    if (shouldSync) {
      this.syncClassesAndDecorations();
    }

    if (
      this.host.typewriterMode.enabled &&
      (hasRefreshEffect(update) || update.selectionSet || update.docChanged || update.focusChanged)
    ) {
      this.scheduleScroll(hasRefreshEffect(update));
    }
  }

  destroy(): void {
    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }

    this.cancelScrollAnimation();
    this.host.unregisterEditorView(this.view);
  }

  private syncClassesAndDecorations(): void {
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
      this.decorations = Decoration.none;
      return;
    }

    const activeLine = this.view.state.doc.lineAt(this.view.state.selection.main.head);
    this.decorations = Decoration.set([
      Decoration.line({
        attributes: {
          class: "centerline-mode-focus-active"
        }
      }).range(activeLine.from)
    ]);
  }

  private scheduleScroll(force: boolean): void {
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

  private scrollPositionToCenter(position: number): void {
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

  private animateScrollTo(targetTop: number): void {
    this.cancelScrollAnimation();

    const scroller = this.view.scrollDOM;
    const startTop = scroller.scrollTop;
    const distance = targetTop - startTop;
    const duration = Math.min(280, Math.max(160, Math.abs(distance) * 0.45));
    const startedAt = performance.now();
    const token = this.scrollAnimationToken;

    const step = (now: number): void => {
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

  private cancelScrollAnimation(): void {
    this.scrollAnimationToken += 1;
    if (this.scrollAnimationFrame !== null) {
      window.cancelAnimationFrame(this.scrollAnimationFrame);
      this.scrollAnimationFrame = null;
    }
  }

  private isPositionNearCenter(position: number): boolean {
    const coordinates = this.view.coordsAtPos(position);
    if (!coordinates) {
      return false;
    }

    const scrollerRect = this.view.scrollDOM.getBoundingClientRect();
    const positionCenter = (coordinates.top + coordinates.bottom) / 2;
    const scrollerCenter = (scrollerRect.top + scrollerRect.bottom) / 2;

    return Math.abs(positionCenter - scrollerCenter) < 8;
  }
}

export function createEditorExtension(host: EditorModeHost): Extension {
  return ViewPlugin.fromClass(
    class extends CenterlineEditorView {
      constructor(view: EditorView) {
        super(host, view);
      }
    },
    {
      decorations: (value) => value.decorations
    }
  );
}
