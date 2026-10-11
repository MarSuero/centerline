export class TypewriterModeController {
  enabled = false;

  constructor(private readonly onChange: () => void) {}

  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    this.onChange();
  }
}
