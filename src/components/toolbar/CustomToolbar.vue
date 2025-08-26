<template>
  <div class="CustomToolbar">
    <!-- Annotate 工具栏 -->
    <div v-if="selectedCategory === 'annotate'" class="annotate-toolbar">
      <!-- 工具栏内容居中容器 -->
      <div class="toolbar-content-center">
        <!-- 主要注释工具 -->
        <div class="annotation-tools">
          <div
            v-for="annotation in annotateTools"
            :key="annotation.type"
            :class="['tool-item', { selected: annotation.type === selectedType }]"
            :title="t(`annotations.${annotation.name}`)"
            @click="onAnnotationClick(annotation)"
          >
            <div class="icon">
              <!-- 如果是选中的工具且有颜色，使用着色图标，否则使用原始图标 -->
              <template v-if="annotation.type === selectedType && annotation.style?.color">
                <ColorableIcon :color="annotation.style.color" :annotationType="annotation.type" />
              </template>
              <template v-else>
                <component :is="annotation.icon" />
              </template>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="toolbar-separator"></div>

        <!-- 选中工具的配色面板 -->
        <div class="color-section">
          <template v-if="currentAnnotation && currentAnnotation.styleEditable?.color">
            <div
              v-for="(color, index) in getToolColors(currentAnnotation)"
              :key="color"
              class="color-tool-container"
            >
              <!-- 颜色按钮 -->
              <div
                :class="['color-preset', { active: currentAnnotation?.style?.color === color }]"
                @click="handleColorChange(color)"
              >
                <ColorableIcon :color="color" :annotationType="currentAnnotation.type" />
              </div>
              
              <!-- 下拉箭头按钮 -->
              <Popover trigger="click" placement="bottomLeft" :arrow="false">
                <template #content>
                  <div class="color-picker-panel">
                    <div class="color-grid">
                      <div class="color-row" v-for="(row, rowIndex) in colorGrid" :key="rowIndex">
                        <div
                          v-for="gridColor in row"
                          :key="gridColor"
                          class="color-cell"
                          :style="{ backgroundColor: gridColor }"
                          :class="{ selected: color === gridColor }"
                          @click="updateToolColor(index, gridColor)"
                        />
                      </div>
                    </div>
                    <div class="custom-section">
                      <div class="custom-color">
                        <button class="custom-btn" @click="openCustomColorPickerForTool(index)">
                          <span>+</span>
                        </button>
                        <span>Custom</span>
                      </div>
                      <div class="opacity-section">
                        <span>Opacity</span>
                        <Slider
                          v-model:value="opacity"
                          :min="0"
                          :max="100"
                          @change="(value: number | [number, number]) => handleOpacityChange(Array.isArray(value) ? value[0] : value)"
                        />
                        <span>{{ opacity }}%</span>
                      </div>
                    </div>
                  </div>
                </template>
                <div class="color-dropdown-trigger">
                  <div class="dropdown-arrow">▼</div>
                </div>
              </Popover>
            </div>
          </template>
          
          <!-- 没有工具选中时显示 -->
          <template v-else>
            <div class="no-preset-message">没有预设</div>
          </template>
        </div>

        <!-- 分隔线 -->
        <div class="toolbar-separator"></div>

        <!-- 操作功能区 -->
        <div class="action-tools">
          <div class="tool-item" :title="t('normal.undo')" @click="handleUndo">
            <div class="icon">↶</div>
          </div>
          <div class="tool-item" :title="t('normal.redo')" @click="handleRedo">
            <div class="icon">↷</div>
          </div>
          <div class="tool-item eraser" :title="t('normal.eraser')" @click="handleEraser">
            <div class="icon">🗑</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 其他分类的工具栏保持原有逻辑 -->
    <div v-else-if="selectedCategory && selectedCategory !== 'view'" class="other-toolbar">
      <div class="annotation-tools">
        <div
          v-for="annotation in annotations"
          :key="annotation.type"
          :class="['tool-item', { selected: annotation.type === selectedType }]"
          :title="t(`annotations.${annotation.name}`)"
          @click="onAnnotationClick(annotation)"
        >
          <template v-if="annotation.type === Annotation.STAMP">
            <StampTool
              :userName="userName"
              :annotation="annotation"
              @add="signatureDataUrl => handleAdd(signatureDataUrl, annotation)"
            />
          </template>
          <template v-else-if="annotation.type === Annotation.SIGNATURE">
            <SignatureTool
              :annotation="annotation"
              @add="signatureDataUrl => handleAdd(signatureDataUrl, annotation)"
            />
          </template>
          <template v-else>
            <div class="icon">
              <component :is="annotation.icon" />
            </div>
          </template>
        </div>
      </div>

      <!-- 颜色选择 -->
      <Popover trigger="click" placement="bottom" :arrow="false">
        <template #content>
          <div class="color-picker-panel">
            <div class="color-presets">
              <div
                v-for="color in defaultOptions.colors"
                :key="color"
                class="color-preset"
                :style="{ backgroundColor: color }"
                :class="{ active: currentAnnotation?.style?.color === color }"
                @click="handleColorChange(color)"
              />
            </div>
            <div class="custom-color">
              <input
                type="color"
                :value="currentAnnotation?.style?.color || defaultOptions.setting.COLOR"
                @input="(e) => handleColorChange((e.target as HTMLInputElement).value)"
              />
              <span>{{ t('normal.customColor') }}</span>
            </div>
          </div>
        </template>
        <div :class="['tool-item', { disabled: isColorDisabled }]" :title="t('normal.color')">
          <div class="icon">
            <PaletteIcon :style="{ color: currentAnnotation?.style?.color }" />
          </div>
        </div>
      </Popover>
    </div>

    <!-- 隐藏的颜色输入框 -->
    <input
      ref="colorInput"
      type="color"
      style="display: none"
      :value="currentAnnotation?.style?.color || '#000000'"
      @input="(e) => handleColorChange((e.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineExpose, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  message,
  Slider,
  Popover 
} from 'ant-design-vue'
import {
  annotationDefinitions,
  Annotation,
  type AnnotationType,
  type IAnnotationStyle,
  type IAnnotationType,
  PdfjsAnnotationEditorType
} from '../../const/definitions'
import { 
  // ExportIcon, 
  PaletteIcon, 
  // SaveIcon, 
  // HighlightIcon,
  // UnderlineIcon,
  // StrikeoutIcon,
  // SquigglyIcon,
  // NoteIcon,
  // FreehandIcon,
  // FreeHighlightIcon
} from '../../const/icon'
import SignatureTool from './signature.vue'
import StampTool from './stamp.vue'
import { defaultOptions } from '../../const/default_options'
// import { FilePdfOutlined } from '@ant-design/icons-vue'

interface Props {
  defaultAnnotationName: string
  userName: string
  selectedCategory?: string
  onChange: (annotation: IAnnotationType | null, dataTransfer: string | null) => void
  onSave: () => void
  onExport: (type: 'pdf' | 'excel') => void
  onUndo?: () => void
  onRedo?: () => void
  onEraser?: () => void
}
const props = defineProps<Props>()
const { t } = useI18n()

// 创建可着色的图标组件
const ColorableIcon = ({ color, annotationType }: { color: string, annotationType: number }) => {
  // 根据不同的工具类型，创建带颜色的图标
  switch(annotationType) {
    case Annotation.HIGHLIGHT:
      // 第一个path着色，第二个path保持默认颜色
      return h('svg', {
        viewBox: '0 0 24 24',
        style: { height: '14px', width: '14px' }
      }, [
        h('path', {
          fill: color, // 着色区域：第一个path
          d: 'M9.91,13.07h3.86L11.84,8.46Zm5.46,3.68L14.62,15H9.05L7.77,18H5.63L10.45,6.64a1,1,0,0,1,1-.64h1a1.23,1.23,0,0,1,1,.64l2,4.91V4H5.85A2.22,2.22,0,0,0,3.63,6.22V17.78A2.22,2.22,0,0,0,5.85,20h9.52Z'
        }),
        h('path', {
          fill: 'currentColor', // 保持默认颜色
          d: 'M20.37,2V22h-2V2Z'
        })
      ])
    
    case Annotation.STRIKEOUT:
      // rect着色，path保持默认颜色
      return h('svg', {
        viewBox: '0 0 24 24',
        style: { height: '14px', width: '14px' }
      }, [
        h('rect', {
          fill: color, // 着色区域：rect删除线
          x: '3.13',
          y: '11.31',
          width: '17.74',
          height: '2.5' // 增加线宽，从1.7增加到2.5
        }),
        h('path', {
          fill: 'currentColor', // 保持默认颜色
          d: 'M12,5l2.4,5.77h2.68l-3.28-8A1.49,1.49,0,0,0,12.64,2H11.49a1.24,1.24,0,0,0-1.16.77L7,10.73H9.59Zm3.25,8.62,2,4.74h2.57l-2-4.74ZM4.17,18.32H6.74l2-4.74H6.18Z'
        })
      ])
    
    case Annotation.UNDERLINE:
      // rect着色，path保持默认颜色，显示字母A
      return h('svg', {
        viewBox: '0 0 24 24',
        style: { height: '14px', width: '14px' }
      }, [
        h('path', {
          fill: 'currentColor', // 保持默认颜色，显示字母A
          d: 'M8.53,13.2h6.94l1.6,3.74h2.66L13.87,2.8a1.54,1.54,0,0,0-1.2-.8h-1.2a1.27,1.27,0,0,0-1.2.8l-6,14.14H6.93ZM12,5.07l2.4,5.73H9.6Z'
        }),
        h('rect', {
          fill: color, // 着色区域：rect下划线
          x: '2.8',
          y: '20.29',
          width: '18.4',
          height: '2.5' // 增加线宽，从1.7增加到2.5
        })
      ])
    
    case Annotation.FREE_HIGHLIGHT:
      // 波浪线path着色
      return h('svg', {
        viewBox: '0 0 24 24',
        style: { height: '14px', width: '14px' }
      }, [
        h('path', {
          fill: color, // 着色区域：波浪线
          d: 'M21,20V22a3,3,0,0,1-2.56-1.41c-.38-.51-.64-.64-1-.64s-.51.13-1,.64A3.34,3.34,0,0,1,13.79,22a3,3,0,0,1-2.56-1.41c-.38-.51-.64-.64-1-.64s-.52.13-1,.64A3.34,3.34,0,0,1,6.62,22a3,3,0,0,1-2.57-1.41c-.38-.51-.64-.64-1-.64V17.9a3,3,0,0,1,2.56,1.41c.38.51.64.64,1,.64s.51-.13,1-.64a3.32,3.32,0,0,1,2.57-1.41,3,3,0,0,1,2.56,1.41c.38.51.64.64,1,.64s.52-.13,1-.64a3.31,3.31,0,0,1,2.56-1.41A3,3,0,0,1,20,19.31C20.33,19.82,20.59,20,21,20Z'
        }),
        h('path', {
          fill: 'currentColor', // 保持默认颜色
          d: 'M8.79,12.77h6.67L17,16.36h2.56L13.92,2.64A1.34,1.34,0,0,0,12.77,2H11.62a1.24,1.24,0,0,0-1.16.77L4.69,16.36H7.26Zm3.34-7.95,2.31,5.51H9.82Z'
        })
      ])
    
    default:
      return h('div', { style: { color: color, fontSize: '14px' } }, '●')
  }
}

// 状态
// const colorPickerOpen = ref(false)
const opacity = ref(100)
const colorInput = ref<HTMLInputElement | null>(null)

// 为每个工具配置独特的四种颜色
const getToolColors = (annotation: IAnnotationType): string[] => {
  // 优先从存储中获取，如果没有则使用默认配置
  if (toolColorsStore.value[annotation.type]) {
    return toolColorsStore.value[annotation.type]
  }
  
  const colorMap: Record<number, string[]> = {
    [Annotation.HIGHLIGHT]: ['#ffff00', '#00ff00', '#ff0000', '#0000ff'],
    [Annotation.UNDERLINE]: ['#ff0000', '#0000ff', '#008000', '#ff8c00'],
    [Annotation.STRIKEOUT]: ['#ff0000', '#000000', '#696969', '#8b0000'],
    [Annotation.FREE_HIGHLIGHT]: ['#ff69b4', '#00ced1', '#9370db', '#32cd32'],
    [Annotation.NOTE]: ['#ffd700', '#ff6347', '#4169e1', '#32cd32'],
    [Annotation.FREEHAND]: ['#000000', '#ff0000', '#0000ff', '#008000']
  }
  
  const defaultColors = colorMap[annotation.type] || ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
  toolColorsStore.value[annotation.type] = [...defaultColors]
  return defaultColors
}

// 存储每个工具的颜色配置
const toolColorsStore = ref<Record<number, string[]>>({})

// 初始化工具颜色存储
const initializeToolColors = () => {
  Object.values(Annotation).forEach((annotationType) => {
    if (typeof annotationType === 'number') {
      const defaultColors = getToolColors({ type: annotationType } as IAnnotationType)
      toolColorsStore.value[annotationType] = [...defaultColors]
    }
  })
}

// 初始化
initializeToolColors()

// Annotate工具的固定顺序
const annotateTools = computed<IAnnotationType[]>(() => {
  const toolOrder = [
    Annotation.HIGHLIGHT,
    Annotation.UNDERLINE, 
    Annotation.STRIKEOUT,
    Annotation.FREE_HIGHLIGHT, // Squiggly
    Annotation.NOTE,
    Annotation.FREEHAND,
    Annotation.FREE_HIGHLIGHT
  ]
  
  return toolOrder.map(type => 
    annotationDefinitions.find(def => def.type === type)
  ).filter(Boolean) as IAnnotationType[]
})

// Category definitions
const categoryToAnnotations = {
  'annotate': [
    Annotation.HIGHLIGHT,
    Annotation.UNDERLINE,
    Annotation.STRIKEOUT,
    Annotation.FREE_HIGHLIGHT,
    Annotation.NOTE,
    Annotation.FREEHAND,
    Annotation.FREE_HIGHLIGHT
  ],
  'shapes': [
    Annotation.FREEHAND,
    Annotation.FREE_HIGHLIGHT,
    Annotation.RECTANGLE,
    Annotation.CIRCLE,
    Annotation.ARROW
  ],
  'insert': [
    Annotation.SIGNATURE,
    Annotation.STAMP
  ],
  'measure': []
}

// state
const defaultAnnotation = computed<IAnnotationType | null>(() => {
  if (!props.defaultAnnotationName) return null
  return annotationDefinitions.find(item => item.name === props.defaultAnnotationName) || null
})

const currentAnnotation = ref<IAnnotationType | null>(defaultAnnotation.value)

// Filter annotations based on selected category
const filteredAnnotations = computed<IAnnotationType[]>(() => {
  const allAnnotations = annotationDefinitions.filter(item => item.pdfjsEditorType !== PdfjsAnnotationEditorType.HIGHLIGHT)
  
  if (!props.selectedCategory) {
    return allAnnotations
  }
  
  const categoryTypes = categoryToAnnotations[props.selectedCategory as keyof typeof categoryToAnnotations] || []
  return allAnnotations.filter(annotation => categoryTypes.includes(annotation.type as never))
})

// 颜色网格配置 - 按照annotate_2.png的设计
const colorGrid = [
  ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#c9baff', '#ffbaff', '#ffb3ba'],
  ['#ff7f7f', '#ffbf7f', '#ffff7f', '#7fff9f', '#7fcfff', '#9f7fff', '#ff7fff', '#ff7f7f'],
  ['#8b0000', '#ff8c00', '#ffd700', '#008000', '#008b8b', '#000080', '#800080', '#8b0000'],
  ['#696969', '#a9a9a9', '#000000', '#000000', '#000000', '#000000', '#000000', '#ffffff']
]

const annotations = ref<IAnnotationType[]>(filteredAnnotations.value)
const dataTransfer = ref<string | null>(null)

const selectedType = computed(() => currentAnnotation.value?.type)
const isColorDisabled = computed(() => !currentAnnotation.value?.styleEditable?.color)

// Watch for category changes
watch(() => props.selectedCategory, () => {
  annotations.value = filteredAnnotations.value
  // Reset current annotation if it's not in the new category
  if (currentAnnotation.value && !filteredAnnotations.value.some(a => a.type === currentAnnotation.value?.type)) {
    currentAnnotation.value = null
  }
})

// methods
function onAnnotationClick(annotation: IAnnotationType | null) {
  if (annotation?.type === selectedType.value) {
    currentAnnotation.value = null
  } else {
    currentAnnotation.value = annotation
  }
  if (annotation?.type !== Annotation.SIGNATURE) {
    dataTransfer.value = null
  }
}

function handleAdd(signatureDataUrl: string, annotation: IAnnotationType) {
  message.info(t('toolbar.message.selectPosition'))
  dataTransfer.value = signatureDataUrl
  currentAnnotation.value = annotation
}

function handleColorChange(color: string) {
  if (!currentAnnotation.value) return
  const updatedAnnotation: IAnnotationType = {
    ...currentAnnotation.value,
    style: { ...currentAnnotation.value.style, color }
  }
  annotations.value = annotations.value.map(a =>
    a.type === currentAnnotation.value?.type ? updatedAnnotation : a
  )
  currentAnnotation.value = updatedAnnotation
}

// 更新特定工具特定位置的颜色
function updateToolColor(colorIndex: number, newColor: string) {
  if (!currentAnnotation.value) return
  
  // 更新存储中的颜色
  const currentColors = [...toolColorsStore.value[currentAnnotation.value.type]]
  currentColors[colorIndex] = newColor
  toolColorsStore.value[currentAnnotation.value.type] = currentColors
  
  // 更新当前工具的颜色
  handleColorChange(newColor)
}

// 为特定工具打开自定义颜色选择器
function openCustomColorPickerForTool(colorIndex: number) {
  // 使用共享的隐藏颜色输入框
  if (colorInput.value && currentAnnotation.value) {
    colorInput.value.value = currentAnnotation.value.style?.color || '#000000'
    
    // 创建临时事件处理器
    const handleColorChange = (e: Event) => {
      const newColor = (e.target as HTMLInputElement).value
      updateToolColor(colorIndex, newColor)
      colorInput.value?.removeEventListener('input', handleColorChange)
    }
    
    colorInput.value.addEventListener('input', handleColorChange)
    colorInput.value.click()
  }
}

// 新增操作方法
function handleUndo() {
  props.onUndo?.()
}

function handleRedo() {
  props.onRedo?.()
}

function handleEraser() {
  props.onEraser?.()
}

function handleOpacityChange(value: number) {
  opacity.value = value
  // TODO: 应用透明度变化
}
function updateStyle(annotationType: AnnotationType, style: IAnnotationStyle) {
  annotations.value = annotations.value.map(annotation => {
    if (annotation.type.toString() === annotationType.toString()) {
      annotation.style = { ...annotation.style, ...style }
    }
    return annotation
  })
}

// expose 方法 (代替 forwardRef)  
function activeAnnotation(annotation: IAnnotationType) {
  onAnnotationClick(annotation)
}

defineExpose({
  activeAnnotation,
  updateStyle
})

// watch => props.onChange
watch([currentAnnotation, dataTransfer], ([anno, transfer]) => {
  props.onChange(anno, transfer)
})
</script>

<style lang="scss" scoped>
@use './index.scss' as *;

.CustomToolbar {
  display: flex;
  align-items: center;
  justify-content: center; /* 居中对齐 */
  padding: 4px 8px;
  background: var(--toolbar-bg-color, #f8f9fa);
  border-bottom: 1px solid var(--toolbar-border-color, #e0e0e0);
  min-height: 35px;
  position: relative; /* 确保不会覆盖其他元素 */
  z-index: 1; /* 较低的z-index */
  pointer-events: auto; /* 确保点击事件正常 */
}

.annotate-toolbar {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center; /* 居中对齐 */
}

.toolbar-content-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--toolbar-border-color, #ccc);
  margin: 0 4px;
}

.other-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  
  .annotation-tools {
    display: flex;
    gap: 4px;
  }
}

.annotation-tools {
  display: flex;
  gap: 4px;
  align-items: center;
}

.tool-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f6f8fa;
  }
  
  &.selected {
    background: #e3f2fd;
    color: #1976d2;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .icon {
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
  }
}

.color-section {
  width: 146px;
  padding: 5px 8px;
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: 7px;
  background: white; /* 白色背景 */
  display: flex;
  align-items: center;
  gap: 4px; /* 减小间距 */
  justify-content: flex-start;
  
  .no-preset-message {
    width: 100%;
    text-align: center;
    color: #666;
    font-size: 12px;
    padding: 3px 0;
  }
  
  .color-tool-container {
    display: flex;
    align-items: center;
    
    .color-preset {
      width: 20px;
      height: 20px;
      min-width: 20px; /* 固定最小宽度 */
      border-radius: 3px;
      border: 1px solid transparent; /* 默认透明边框，防止布局跳动 */
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0; /* 防止挤压 */
      
      &:hover {
        background: #f6f8fa;
        transform: scale(1.05);
        transform-origin: center;
        border: 1px solid #d0d7de; /* hover时才显示边框 */
      }
      
      &.active {
        background: #e3f2fd;
        border: 1px solid #1976d2;
        box-shadow: 0 0 4px rgba(25, 118, 210, 0.3);
      }
      
      /* 图标尺寸 */
      svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }
    }
    
    .color-dropdown-trigger {
      width: 10px;
      height: 20px;
      border-left: none; /* 与颜色按钮连接 */
      cursor: pointer;
      background: white;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      &:hover {
        background: #f6f8fa;
        border-color: #1976d2;
      }
      
      .dropdown-arrow {
        color: #666;
        font-size: 6px;
        line-height: 1;
      }
    }
  }
}

.action-tools {
  display: flex;
  gap: 4px;
  margin-left: auto;
  
  .eraser {
    .icon {
      font-size: 18px;
    }
  }
}

.action-section {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 8px;
  
  .splitToolbarButtonSeparator {
    width: 1px;
    height: 24px;
    background: var(--toolbar-border-color, #e0e0e0);
  }
  
  .save-export {
    display: flex;
    gap: 4px;
  }
}

.color-picker-panel {
  width: 240px;
  padding: 12px;
  
  .color-grid {
    margin-bottom: 12px;
    
    .color-row {
      display: flex;
      gap: 2px;
      margin-bottom: 2px;
      
      .color-cell {
        width: 20px;
        height: 20px;
        min-width: 20px; /* 防止挤压 */
        min-height: 20px; /* 防止挤压 */
        border-radius: 3px;
        border: 1px solid transparent; /* 默认透明边框 */
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0; /* 防止挤压 */
        
        &:hover {
          transform: scale(1.1);
          border: 1px solid #1976d2; /* hover时显示边框 */
        }
        
        &.selected {
          border: 2px solid #1976d2;
          box-shadow: 0 0 4px rgba(25, 118, 210, 0.5);
        }
      }
    }
  }
  
  .custom-section {
    border-top: 1px solid #eee;
    padding-top: 8px;
    
    .custom-color {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      
      .custom-btn {
        width: 24px;
        height: 24px;
        border: 1px dashed #ccc;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &:hover {
          border-color: #1976d2;
        }
      }
      
      span {
        font-size: 12px;
        color: #666;
      }
    }
    
    .opacity-section {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      
      span {
        color: #666;
        min-width: 45px;
        
        &:last-child {
          min-width: 30px;
        }
      }
      
      .ant-slider {
        flex: 1;
      }
    }
  }
}
</style>
