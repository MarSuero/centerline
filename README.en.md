# Centerline

[中文说明](README.md)

Centerline is an Obsidian plugin that provides Typora-style focus and typewriter modes for Markdown editors.

## Features

- **Focus Mode** dims non-active editor lines while keeping the cursor line clear.
- **Typewriter Mode** moves the cursor line toward the vertical center with smooth scrolling.
- Works in both **Live Preview** and **Source Mode**.
- The two modes are independent and can be enabled together.
- Modes are disabled after a plugin reload.
- Custom shortcuts support modifier keys, IME composition, macOS modifier display, conflict checks, persistence, and reset actions.
- Default shortcuts:
  - `F8`: Toggle Focus Mode
  - `F9`: Toggle Typewriter Mode

Reading Mode is not modified.

## Installation

### Install from a Release

1. Download `main.js`, `manifest.json`, and `styles.css` from the matching GitHub Release.
2. Create this folder inside your vault:

   ```text
   <your-vault>/.obsidian/plugins/centerline/
   ```

3. Copy the three files into that folder.
4. Open **Settings > Community plugins** in Obsidian.
5. Enable **Centerline**.

### Manual installation

You can also download the repository as a ZIP and copy `main.js`, `manifest.json`, and `styles.css` into the plugin folder above.

## Settings

Open **Settings > Community plugins > Centerline** to:

- Adjust Focus Mode opacity.
- Restore the default opacity.
- Change the Focus Mode shortcut.
- Change the Typewriter Mode shortcut.
- Restore either shortcut or both defaults.

The default Focus Mode opacity is `42%`, and the saved value persists across plugin reloads.

## Commands

The command palette provides:

- Toggle Focus Mode
- Toggle Typewriter Mode

The plugin does not assign fixed command hotkeys. Shortcuts are managed in the settings page.

## Development

The project follows the official Obsidian sample plugin layout and uses TypeScript with esbuild.

```bash
npm install
npm run build
npm run dev
```

The build generates `main.js`. Copy it together with `manifest.json` and `styles.css` into the vault plugin folder.

CodeMirror 6 extensions are registered through `registerEditorExtension`. Obsidian's CodeMirror packages remain external in the build to avoid loading a second CodeMirror instance.

## Known limitations

- The plugin only affects Markdown editor views.
- Visual results depend on the active theme and editor layout.
- Reading Mode is not changed.

## License

MIT License. See [LICENSE](LICENSE).
