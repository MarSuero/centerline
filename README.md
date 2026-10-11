# Centerline

Centerline is an Obsidian plugin that brings Typora-style focus and typewriter editing modes to Markdown editors.

## Features

- **Focus Mode** dims non-active editor lines while keeping the cursor line fully visible.
- **Typewriter Mode** keeps the cursor line near the vertical center of the editor with smooth scrolling.
- Works in both **Live Preview** and **Source Mode**.
- Focus Mode and Typewriter Mode are independent and can be enabled together.
- Modes are disabled after a plugin reload.
- Custom shortcuts support modifier keys, IME composition, macOS modifier display, conflict checks, persistence, and reset-to-default actions.
- Default shortcuts:
  - `F8`: Toggle Focus Mode
  - `F9`: Toggle Typewriter Mode

Reading Mode is intentionally not modified.

## Installation

### Manual installation

1. Download this repository as a ZIP file.
2. Create a folder named `centerline` under your vault:

   ```text
   <your-vault>/.obsidian/plugins/centerline/
   ```

3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Open **Settings > Community plugins** in Obsidian.
5. Enable **Centerline**.

### Development installation

Clone the repository, install dependencies, and build:

```bash
npm install
npm run build
```

Copy the generated `main.js`, together with `manifest.json` and `styles.css`, into the vault plugin folder above. Use `npm run dev` while developing for a watch build.

## Settings

Open **Settings > Community plugins > Centerline** to:

- Adjust Focus Mode opacity.
- Restore the default opacity.
- Change the Focus Mode shortcut.
- Change the Typewriter Mode shortcut.
- Restore either shortcut or both defaults.

The default Focus Mode opacity is `42%`. The saved value is kept across plugin reloads.

## Commands

The command palette provides:

- Toggle Focus Mode
- Toggle Typewriter Mode

The plugin does not assign fixed command hotkeys. Shortcuts are managed in the Centerline settings page so old bindings are removed immediately when changed.

## Development

The project follows the official Obsidian sample plugin layout and uses TypeScript with esbuild.

```bash
npm run build
npm run dev
```

CodeMirror 6 extensions are registered through `registerEditorExtension`. Obsidian's CodeMirror packages remain external in the build to avoid loading a second CodeMirror instance.

## Known limitations

- The plugin only affects Markdown editor views.
- Visual verification still depends on the active Obsidian theme and editor layout.
- The plugin does not change Reading Mode.

## License

MIT License. See [LICENSE](LICENSE).
