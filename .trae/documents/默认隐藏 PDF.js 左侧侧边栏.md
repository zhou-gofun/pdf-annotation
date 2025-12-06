## 目标

* 启动时让 PDF.js 左侧侧边栏默认关闭（无 `sidebarOpen` 类），即使存在历史记录或通知态也不自动展开。

* 可选：同时隐藏切换按钮 `#sidebarToggleButton`（即用户提到的 toggle-sidebar-button / toggle-sidebar-notification-button 使用的同一按钮）。

## 关键点

* 侧栏由 `PDFSidebar` 管理，打开时给 `#outerContainer` 加 `sidebarOpen` 类；关闭时移除。

  * `public/pdfjs-5.4.54-dist/web/viewer.mjs:8648–8818`（`class PDFSidebar`，`open/close/toggle` 实现）

* 初始视图由 `sidebarViewOnLoad`、`localStorage(pdfjs.history)` 和 PDF `pageMode` 决定，最终调用 `pdfSidebar.setInitialView(...)`。

  * `public/pdfjs-5.4.54-dist/web/viewer.mjs:760–916`（`AppOptions` 默认值包含 `sidebarViewOnLoad:-1`）

  * `public/pdfjs-5.4.54-dist/web/viewer.mjs:15967–16004`（读取历史、pageMode 并设置 `setInitialView`）

* 通知态按钮并非独立按钮，仍是 `#sidebarToggleButton`，仅切换 `data-l10n-id` 与加 `pdfSidebarNotification` 类。

  * `public/pdfjs-5.4.54-dist/web/viewer.mjs:8758–8818`

## 实施方案

1. 启动时强制关闭侧栏（推荐且不改动第三方文件）

   * 在你现有扩展中，监听 PDF 加载完成后立即关闭：

   * 位置：`src/index.ts:655` 的 `documentloaded` 回调开头添加 `this.PDFJS_PDFViewerApplication.pdfSidebar?.close()`。

   * 这样无论历史记录/通知态是否要求展开，都统一默认关闭。

2. 防止“默认视图”导致强制展开（可选，保守做法不改 vendor）

   * 若需要更彻底，可在获取到 `PDFViewerApplication` 后、PDF 文档加载前调用：

     * `this.PDFJS_PDFViewerApplication.pdfSidebar?.setInitialView(0)` 或直接 `close()`；`0` 即 `SidebarView.NONE`。

   * 不建议直接改 `viewer.mjs` 的默认值（升级不友好）。

3. 隐藏切换按钮（可选）

   * 若希望界面上也隐藏按钮：

     * 将 `'#sidebarToggleButton'` 加入你已有的隐藏列表：`src/const/default_options.ts:92–107` 的 `HIDE_PDFJS_ELEMENT`；扩展在 `src/index.ts:579–590` 已统一按选择器隐藏元素。

     * 或在 `src/scss/app.scss` 添加样式：`#sidebarToggleButton { display: none; }`。

## 验证

* 打开任意 PDF：

  * 检查 `#outerContainer` 不含 `sidebarOpen`（侧栏收起）。

  * `#sidebarToggleButton` 的 `aria-expanded` 为 `false`。

  * 点击按钮后侧栏应仍能正常展开/收起（若你未选择隐藏按钮）。

## 说明

* 以上方案不修改 `public/pdfjs-5.4.54-dist/web/viewer.mjs`，易于升级维护。

* 你的扩展已有“隐藏原生元素”的统一入口，按需可无侵入隐藏侧栏按钮。

