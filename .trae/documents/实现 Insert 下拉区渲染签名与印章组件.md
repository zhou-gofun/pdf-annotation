## 目标
- 在 `src/components/toolbar/CustomToolbar.vue` 的 Insert 分类下，将右侧“下拉选择区”真正渲染 `signature.vue` 与 `stamp.vue` 的 inline 版本内容。
- 根据所选工具类型（签名/印章）展示不同的下拉内容：
  - 选择签名：展示已有签名列表、预览和“新增签名”入口。
  - 选择印章：下拉顶部提供“Standard/Custom”切换，Standard 显示默认印章列表，Custom 显示自定义印章列表并在末尾提供“添加印章/上传”入口。
- 选择或创建后，立即更新右侧预览以及 `dataTransfer`，并提示“请选择落点”。

## 现状与问题定位
- 当前位置的下拉区使用的是 `<a-menu>` 静态列表，未渲染复杂内容，见 `CustomToolbar.vue:238` 的 `#overlay` 插槽。
- 已存在 inline 区域直接渲染 `<SignatureTool/>` 和 `<StampTool/>`（`CustomToolbar.vue:259-267`），但未放入下拉 Overlay 中。
- 组件导入被移除，`CustomToolbar.vue:336` 标注 `removed SignatureTool and StampTool imports`，导致无法在模板中使用两组件。

## 修改方案
1. 重新导入组件
- 在 `script setup` 头部增加：
  - `import SignatureTool from './signature.vue'`
  - `import StampTool from './stamp.vue'`

2. 替换 Dropdown 的 Overlay 内容
- 将现有 `#overlay` 中的 `<a-menu>` 替换为一个容器，按类型渲染内联组件：
  - 当 `currentAnnotation.type === Annotation.SIGNATURE`：
    - 渲染 `<SignatureTool :annotation="currentAnnotation" inline @add="onInlineAdd" />`
  - 当 `currentAnnotation.type === Annotation.STAMP`：
    - 渲染 `<StampTool :annotation="currentAnnotation" :userName="userName" inline @add="onInlineAdd" />`
- 保留 Dropdown 触发器文本显示选中的项名或“创建签名/创建印章”。

3. 数据流与事件
- 继续使用现有的统一列表与选择：
  - `createdSignatures`、`createdStamps`、`selectedInsertItem`、`dataTransfer`（`CustomToolbar.vue:378-381, 561`）。
- 绑定两组件的 `@add` 事件为 `onInlineAdd(dataUrl)`：
  - 将新建或选中的 dataUrl 推入对应 `createdSignatures/createdStamps`（若未存在），更新 `selectedInsertItem` 与 `dataTransfer`，并提示信息（`CustomToolbar.vue:796-807`）。
- 移除旧的 `<a-menu>` 与 `onInsertMenuClick`（`CustomToolbar.vue:786-793`）的使用；若无其他引用，可删除其方法定义以避免未用代码。

4. 预览与标签
- 预览区域保持不变：选中项后在右侧显示 `<img :src="selectedInsertItem" />`（`CustomToolbar.vue:255-256`）。
- `currentInsertLabel` 继续根据 `selectedInsertItem` 计算；若需要更细标签，可后续基于来源（签名/印章）扩展。

5. 样式
- 在下拉 Overlay 容器外层包裹一个 div，例如 `insert-dropdown-overlay`，并设置合适的宽度与滚动：
  - 例如：`max-height: 260px; overflow: auto; padding: 8px;`，以适配 `SignatureInline` 和 `StampInline` 的网格与面板。
- 不更动两子组件的样式；它们的 inline 版本已包含所需的“列表/切换/添加/上传”等交互（参考 `stamp.vue` 的 `StampInline` 与 `signature.vue` 的内联结构）。

6. 验证
- 运行构建，确保无 TS 报错（尤其是组件导入和未用方法）。
- 交互验证：
  - 选择“签名”→ 打开下拉：显示已有签名及“新增签名”按钮；新建后 `createdSignatures` 与预览同步更新。
  - 选择“印章”→ 打开下拉：顶部显示 Standard/Custom 切换；Default 列表点击即选中；切到 Custom 时展示自定义缩略图，尾部“Create New Stamp”和“Upload”可创建/上传并立即可选；选择后预览更新、提示选择落点。

## 交付内容
- 更新 `CustomToolbar.vue`：
  - 恢复并使用两组件的导入与在 `#overlay` 中渲染。
  - 清理不再使用的 `onInsertMenuClick` 及相关 `<a-menu>` 模板。
  - 可选：新增 `insert-dropdown-overlay` 样式块以提升下拉内容容器观感。

请确认以上方案，确认后我将直接实施修改并进行构建与交互验证。