import { reactive } from 'vue'

// 调色板数据接口
export interface ColorPaletteData {
  defaultColors: string[][] // 默认颜色网格 [行][列]
  customColors: Record<number, string[]> // 每个工具的自定义颜色 {toolType: colors}
  toolOpacity: Record<number, number> // 每个工具的透明度 {toolType: opacity}
  toolStrokeWidth: Record<number, number> // 每个工具的线宽 {toolType: strokeWidth}
  globalOpacity: number // 全局透明度
  globalStrokeWidth: number // 全局线宽
}

// 默认颜色网格配置 - 与ColorPanel.vue中的保持一致
const defaultColorGrid = [
  // 第一行：淡色
  ['#ffcccc', '#ffddaa', '#ffffaa', '#ccffcc', '#aaeeff', '#ddaaff', '#ffaadd'],
  // 第二行：中色  
  ['#ff6666', '#ff9933', '#ffff33', '#66ff66', '#3399ff', '#9966ff', '#ff66dd'],
  // 第三行：深色
  ['#cc0000', '#cc6600', '#cccc00', '#00cc00', '#0066cc', '#6600cc', '#cc0099'],
  // 第四行：灰度和黑白
  ['#ffffff', '#d3d3d3', '#808080', '#404040', '#000000', '#000000', '#000000']
]

// 全局调色板数据状态
const colorPaletteData = reactive<ColorPaletteData>({
  defaultColors: defaultColorGrid,
  customColors: {},
  toolOpacity: {},
  toolStrokeWidth: {},
  globalOpacity: 100,
  globalStrokeWidth: 1
})

// 初始化特定工具的自定义颜色
export function initToolCustomColors(toolType: number) {
  if (!colorPaletteData.customColors[toolType]) {
    colorPaletteData.customColors[toolType] = []
  }
}

// 添加自定义颜色
export function addCustomColor(toolType: number, color: string) {
  initToolCustomColors(toolType)
  const colors = colorPaletteData.customColors[toolType]
  if (!colors.includes(color)) {
    colors.push(color)
  }
}

// 删除自定义颜色
export function deleteCustomColor(toolType: number, color: string) {
  if (!colorPaletteData.customColors[toolType]) return
  
  const colors = colorPaletteData.customColors[toolType]
  const index = colors.indexOf(color)
  if (index > -1) {
    colors.splice(index, 1)
  }
}

// 获取特定工具的自定义颜色
export function getCustomColors(toolType: number): string[] {
  return colorPaletteData.customColors[toolType] || []
}

// 设置工具透明度
export function setToolOpacity(toolType: number, opacity: number) {
  colorPaletteData.toolOpacity[toolType] = opacity
}

// 获取工具透明度
export function getToolOpacity(toolType: number, defaultValue: number = 100): number {
  return colorPaletteData.toolOpacity[toolType] || defaultValue
}

// 设置工具线宽
export function setToolStrokeWidth(toolType: number, strokeWidth: number) {
  colorPaletteData.toolStrokeWidth[toolType] = strokeWidth
}

// 获取工具线宽
export function getToolStrokeWidth(toolType: number, defaultValue: number = 1): number {
  return colorPaletteData.toolStrokeWidth[toolType] || defaultValue
}

// 设置全局透明度
export function setGlobalOpacity(opacity: number) {
  colorPaletteData.globalOpacity = opacity
}

// 获取全局透明度
export function getGlobalOpacity(): number {
  return colorPaletteData.globalOpacity
}

// 设置全局线宽
export function setGlobalStrokeWidth(strokeWidth: number) {
  colorPaletteData.globalStrokeWidth = strokeWidth
}

// 获取全局线宽
export function getGlobalStrokeWidth(): number {
  return colorPaletteData.globalStrokeWidth
}

// 导出默认颜色网格
export function getDefaultColors(): string[][] {
  return colorPaletteData.defaultColors
}

// 获取扁平化的默认颜色数组
export function getDefaultColorsFlat(): string[] {
  return colorPaletteData.defaultColors.flat()
}

// 重置特定工具的数据
export function resetToolData(toolType: number) {
  delete colorPaletteData.customColors[toolType]
  delete colorPaletteData.toolOpacity[toolType]
  delete colorPaletteData.toolStrokeWidth[toolType]
}

// 重置所有数据
export function resetAllData() {
  colorPaletteData.customColors = {}
  colorPaletteData.toolOpacity = {}
  colorPaletteData.toolStrokeWidth = {}
  colorPaletteData.globalOpacity = 100
  colorPaletteData.globalStrokeWidth = 1
}

// 导出数据用于持久化
export function exportColorPaletteData(): ColorPaletteData {
  return {
    defaultColors: [...colorPaletteData.defaultColors.map(row => [...row])],
    customColors: { ...Object.fromEntries(Object.entries(colorPaletteData.customColors).map(([k, v]) => [k, [...v]])) },
    toolOpacity: { ...colorPaletteData.toolOpacity },
    toolStrokeWidth: { ...colorPaletteData.toolStrokeWidth },
    globalOpacity: colorPaletteData.globalOpacity,
    globalStrokeWidth: colorPaletteData.globalStrokeWidth
  }
}

// 导入数据用于恢复
export function importColorPaletteData(data: Partial<ColorPaletteData>) {
  if (data.defaultColors) {
    colorPaletteData.defaultColors = data.defaultColors
  }
  if (data.customColors) {
    colorPaletteData.customColors = data.customColors
  }
  if (data.toolOpacity) {
    colorPaletteData.toolOpacity = data.toolOpacity
  }
  if (data.toolStrokeWidth) {
    colorPaletteData.toolStrokeWidth = data.toolStrokeWidth
  }
  if (data.globalOpacity !== undefined) {
    colorPaletteData.globalOpacity = data.globalOpacity
  }
  if (data.globalStrokeWidth !== undefined) {
    colorPaletteData.globalStrokeWidth = data.globalStrokeWidth
  }
}

// 导出响应式数据引用
export const useColorPalette = () => {
  return {
    colorPaletteData,
    // 工具方法
    initToolCustomColors,
    addCustomColor,
    deleteCustomColor,
    getCustomColors,
    setToolOpacity,
    getToolOpacity,
    setToolStrokeWidth,
    getToolStrokeWidth,
    setGlobalOpacity,
    getGlobalOpacity,
    setGlobalStrokeWidth,
    getGlobalStrokeWidth,
    getDefaultColors,
    getDefaultColorsFlat,
    resetToolData,
    resetAllData,
    exportColorPaletteData,
    importColorPaletteData
  }
}