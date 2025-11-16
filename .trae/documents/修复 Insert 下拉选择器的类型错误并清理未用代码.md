## 问题分析
- `ASelect` 的 `value` 期望类型为 `SelectValue`（可为 `string | number | LabeledValue | undefined`），当前使用 `string | null` 导致 TS2322。
- `@change` 期望 `(value: SelectValue, option: DefaultOptionType | DefaultOptionType[]) => void`，当前函数签名为 `(value: string) => void` 导致 TS2322。
- 迁移到 annotate 风格后，文件中残留了未使用的导入与变量（`Popover`、`PaletteIcon`、`defaultOptions`、`isColorDisabled`），触发 TS6133。

## 代码修改
1. `selectedInsertItem` 改为 `ref<string | undefined>` 并初始化为 `undefined`；所有设置清空处使用 `undefined` 而非 `null`。
2. `ASelect` 绑定：
   - 使用 `v-model:value="selectedInsertItem"`（或保持 `:value="selectedInsertItem ?? undefined"`），避免传入 `null`。
   - 保留 `@change` 以设置 `dataTransfer` 与提示。
3. `handleInsertSelectChange` 函数签名调整：
   - 定义为 `(value: SelectValue, option?: any) => void`，内部：
     - 若 `typeof value === 'string'`，直接使用；
     - 若为 `LabeledValue`，读取 `value.value`；
     - 更新 `selectedInsertItem` 与 `dataTransfer`，并 `message.info(t('toolbar.message.selectPosition'))`。
4. `insertOptions` 返回 `{ label: string, value: string }[]` 保持与 `DefaultOptionType` 兼容。
5. 清理未使用代码：移除 `Popover`、`PaletteIcon`、`defaultOptions` 的导入；删除 `isColorDisabled` 计算属性及相关引用。

## 兼容性与类型说明
- `SelectValue` 包含 `undefined` 但不包含 `null`；统一使用 `undefined` 表示“未选择”。
- 默认不启用 `labelInValue`，`@change` 的 `value` 为原始值；计划兼容 `LabeledValue` 以防后续开启。

## 验证步骤
- 本地类型检查：`tsc --noEmit` 或项目构建脚本。
- 交互验证：
  - 在 `insert` 菜单中创建签名/印章，确认下拉选项出现；
  - 选择下拉项后，提示“选择位置”，点击页面插入；
  - 切换到非 `insert/view` 菜单，确认 annotate 风格正常工作，颜色面板与操作区无报错。