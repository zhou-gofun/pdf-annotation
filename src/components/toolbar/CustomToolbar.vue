<template>
  <div class="CustomToolbar">
    <!-- Annotate 工具栏 -->
    <div v-if="selectedCategory === 'annotate'" class="annotate-toolbar">
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
            <component :is="annotation.icon" />
          </div>
        </div>
      </div>

      <!-- 选中工具的配色面板 -->
      <div v-if="currentAnnotation && currentAnnotation.styleEditable?.color" class="color-section">
        <div class="color-presets">
          <div
            v-for="color in getToolColors(currentAnnotation)"
            :key="color"
            :class="['color-preset', { active: currentAnnotation?.style?.color === color }]"
            :style="{ backgroundColor: color }"
            @click="handleColorChange(color)"
          />
        </div>
        
        <!-- 颜色选择下拉框 -->
        <a-popover v-model:open="colorPickerOpen" trigger="click" placement="bottom" :arrow="false">
          <template #content>
            <div class="color-picker-panel">
              <div class="color-grid">
                <div class="color-row" v-for="(row, rowIndex) in colorGrid" :key="rowIndex">
                  <div
                    v-for="color in row"
                    :key="color"
                    class="color-cell"
                    :style="{ backgroundColor: color }"
                    :class="{ selected: currentAnnotation?.style?.color === color }"
                    @click="handleColorChange(color)"
                  />
                </div>
              </div>
              <div class="custom-section">
                <div class="custom-color">
                  <button class="custom-btn" @click="openCustomColorPicker">
                    <span>+</span>
                  </button>
                  <span>Custom</span>
                </div>
                <div class="opacity-section">
                  <span>Opacity</span>
                  <a-slider
                    v-model:value="opacity"
                    :min="0"
                    :max="100"
                    @change="handleOpacityChange"
                  />
                  <span>{{ opacity }}%</span>
                </div>
              </div>
            </div>
          </template>
          <div class="color-dropdown-trigger">
            <div class="dropdown-arrow">▼</div>
          </div>
        </a-popover>
        
        <!-- 隐藏的颜色输入框 -->
        <input
          ref="colorInput"
          type="color"
          style="display: none"
          :value="currentAnnotation?.style?.color || '#000000'"
          @input="(e) => handleColorChange((e.target as HTMLInputElement).value)"
        />
      </div>

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
      <a-popover trigger="click" placement="bottom" :arrow="false">
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
      </a-popover>
    </div>

    <!-- 保存导出区域 -->
    <div class="action-section">
      <div class="splitToolbarButtonSeparator"></div>
      <div class="save-export">
        <div v-if="defaultOptions.setting.SAVE_BUTTON" class="tool-item" :title="t('normal.save')" @click="onSave">
          <div class="icon"><SaveIcon /></div>
        </div>
        <a-popover v-if="defaultOptions.setting.EXPORT_PDF || defaultOptions.setting.EXPORT_EXCEL" trigger="click" placement="bottom" :arrow="false">
          <template #content>
            <a-space direction="vertical">
              <a-button v-if="defaultOptions.setting.EXPORT_PDF" block @click="() => onExport('pdf')">
                <FilePdfOutlined /> PDF
              </a-button>
              <a-button v-if="defaultOptions.setting.EXPORT_EXCEL" block @click="() => onExport('excel')">
                <FilePdfOutlined /> Excel
              </a-button>
            </a-space>
          </template>
          <div class="tool-item" :title="t('normal.export')">
            <div class="icon"><ExportIcon /></div>
          </div>
        </a-popover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineExpose } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  message,
  // Slider,
  // Popover 
  
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
  ExportIcon, 
  PaletteIcon, 
  SaveIcon, 
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
import { FilePdfOutlined } from '@ant-design/icons-vue'

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

// 状态
const colorPickerOpen = ref(false)
const opacity = ref(100)
const colorInput = ref<HTMLInputElement | null>(null)

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

// 为每个工具配置独特的四种颜色
const getToolColors = (annotation: IAnnotationType): string[] => {
  const colorMap: Record<number, string[]> = {
    [Annotation.HIGHLIGHT]: ['#ffff00', '#00ff00', '#ff0000', '#0000ff'],
    [Annotation.UNDERLINE]: ['#ff0000', '#0000ff', '#008000', '#ff8c00'],
    [Annotation.STRIKEOUT]: ['#ff0000', '#000000', '#696969', '#8b0000'],
    [Annotation.FREE_HIGHLIGHT]: ['#ff69b4', '#00ced1', '#9370db', '#32cd32'],
    [Annotation.NOTE]: ['#ffd700', '#ff6347', '#4169e1', '#32cd32'],
    [Annotation.FREEHAND]: ['#000000', '#ff0000', '#0000ff', '#008000'],
    [Annotation.FREE_HIGHLIGHT]: ['#ff1493', '#00bfff', '#9932cc', '#adff2f']
  }
  
  return colorMap[annotation.type] || ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
}
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

function openCustomColorPicker() {
  colorInput.value?.click()
  colorPickerOpen.value = false
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
  padding: 4px 8px;
  background: var(--toolbar-bg-color, #f8f9fa);
  border-bottom: 1px solid var(--toolbar-border-color, #e0e0e0);
  min-height: 35px;
}

.annotate-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
  border: 1px solid #d0d7de;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
  
  &:hover {
    background: #f6f8fa;
    border-color: #1976d2;
  }
  
  &.selected {
    background: #e3f2fd;
    border-color: #1976d2;
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
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  
  .color-presets {
    display: flex;
    gap: 2px;
    
    .color-preset {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      border: 1px solid #d0d7de;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        transform: scale(1.1);
      }
      
      &.active {
        border: 2px solid #1976d2;
        box-shadow: 0 0 4px rgba(25, 118, 210, 0.3);
      }
    }
  }
  
  .color-dropdown-trigger {
    margin-left: 4px;
    padding: 2px 4px;
    border: 1px solid #d0d7de;
    border-radius: 3px;
    cursor: pointer;
    background: white;
    font-size: 10px;
    
    &:hover {
      background: #f6f8fa;
      border-color: #1976d2;
    }
    
    .dropdown-arrow {
      color: #666;
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
        border-radius: 3px;
        border: 1px solid #ddd;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          transform: scale(1.1);
          border-color: #1976d2;
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
