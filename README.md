# Centerline

[English version](README.en.md)

Centerline 是一个 Obsidian 插件，为 Markdown 编辑器提供类似 Typora 的专注模式和打字机模式。

## 功能

- **专注模式**：降低非当前行的透明度，光标所在行保持清晰。
- **打字机模式**：让光标所在行滚动到编辑区垂直中心，并使用平滑过渡动画。
- 同时支持 **Live Preview** 和 **Source Mode**。
- 两种模式相互独立，可以同时开启。
- 插件重载后模式默认关闭。
- 支持自定义快捷键、修饰键、输入法组合态、macOS 修饰键显示、冲突检查和恢复默认。
- 默认快捷键：
  - `F8`：切换专注模式
  - `F9`：切换打字机模式

阅读模式不会被修改。

## 安装

### 从 Release 安装

1. 在 GitHub Releases 下载 `centerline-0.1.0.zip`。
2. 在 vault 中创建目录：

   ```text
   <你的 vault>/.obsidian/plugins/centerline/
   ```

3. 将压缩包中的 `main.js`、`manifest.json` 和 `styles.css` 放入该目录。
4. 打开 Obsidian 的 **设置 > 社区插件**。
5. 启用 **Centerline**。

### 手动安装

也可以直接从仓库下载 ZIP，按上面的目录结构复制 `main.js`、`manifest.json` 和 `styles.css`。

## 设置

打开 **设置 > 社区插件 > Centerline**，可以：

- 调整专注模式透明度。
- 将透明度恢复为默认值。
- 修改专注模式快捷键。
- 修改打字机模式快捷键。
- 分别恢复快捷键或一次恢复全部默认值。

专注模式默认透明度为 `42%`，设置会在插件重载后保留。

## 命令

命令面板提供：

- 切换专注模式
- 切换打字机模式

插件不会给命令注册固定快捷键，快捷键统一在设置页管理。

## 开发

项目采用 Obsidian 官方 sample plugin 的工程结构，使用 TypeScript 和 esbuild。

```bash
npm install
npm run build
npm run dev
```

开发构建会生成 `main.js`。将它与 `manifest.json`、`styles.css` 一起复制到 vault 的插件目录即可。

CodeMirror 6 扩展通过 `registerEditorExtension` 注册，Obsidian 提供的 CodeMirror 包在构建中保持 external，避免加载第二份 CodeMirror 实例。

## 已知限制

- 插件只作用于 Markdown 编辑器视图。
- 最终视觉效果会受到当前主题和编辑器布局影响。
- 阅读模式不会改变。

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
