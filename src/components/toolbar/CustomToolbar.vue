<template>
  <div class="CustomToolbar">
    <!-- 左侧按钮 -->
    <ul class="buttons">
      <li
        v-for="(annotation, index) in annotations"
        :key="index"
        :title="t(`annotations.${annotation.name}`)"
        :class="{ selected: annotation.type === selectedType }"
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
          <!-- <div class="name">{{ t(`annotations.${annotation.name}`) }}</div> -->
        </template>
      </li>

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
        <li :class="{ disabled: isColorDisabled }" :title="t('normal.color')">
          <div class="icon">
            <PaletteIcon :style="{ color: currentAnnotation?.style?.color }" />
          </div>
          <!-- <div class="name">{{ t('normal.color') }}</div> -->
        </li>
      </a-popover>
    </ul>

    <div class="splitToolbarButtonSeparator"></div>

    <!-- 保存 / 导出 -->
    <ul class="buttons">
      <li v-if="defaultOptions.setting.SAVE_BUTTON" :title="t('normal.save')" @click="onSave">
        <div class="icon"><SaveIcon /></div>
        <!-- <div class="name">{{ t('normal.save') }}</div> -->
      </li>

      <li v-if="defaultOptions.setting.EXPORT_PDF || defaultOptions.setting.EXPORT_EXCEL" :title="t('normal.export')">
        <a-popover trigger="click" placement="bottom" :arrow="false">
          <template #content>
            <a-space direction="vertical">
              <a-button
                v-if="defaultOptions.setting.EXPORT_PDF"
                block
                @click="() => onExport('pdf')"
              >
                <FilePdfOutlined /> PDF
              </a-button>
              <a-button
                v-if="defaultOptions.setting.EXPORT_EXCEL"
                block
                @click="() => onExport('excel')"
              >
                <FilePdfOutlined /> Excel
              </a-button>
            </a-space>
          </template>
          <div class="icon"><ExportIcon /></div>
          <!-- <div class="name">{{ t('normal.export') }}</div> -->
        </a-popover>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineExpose } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  annotationDefinitions,
  Annotation,
  type AnnotationType,
  type IAnnotationStyle,
  type IAnnotationType,
  PdfjsAnnotationEditorType
} from '../../const/definitions'
import { ExportIcon, PaletteIcon, SaveIcon } from '../../const/icon'
import SignatureTool from './signature.vue'
import StampTool from './stamp.vue'
import { defaultOptions } from '../../const/default_options'
import { FilePdfOutlined } from '@ant-design/icons-vue'

interface Props {
  defaultAnnotationName: string
  userName: string
  selectedCategory?: string // New prop for selected category
  onChange: (annotation: IAnnotationType | null, dataTransfer: string | null) => void
  onSave: () => void
  onExport: (type: 'pdf' | 'excel') => void
}
const props = defineProps<Props>()
const { t } = useI18n()

// Category definitions
const categoryToAnnotations = {
  'annotate': [
    Annotation.HIGHLIGHT,
    Annotation.UNDERLINE,
    Annotation.STRIKEOUT,
    Annotation.NOTE,
    Annotation.RECTANGLE,
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
  'measure': [
    // Add measure annotations when implemented
  ]
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

// expose 方法 (代替 forwardRef)
function activeAnnotation(annotation: IAnnotationType) {
  onAnnotationClick(annotation)
}
function updateStyle(annotationType: AnnotationType, style: IAnnotationStyle) {
  annotations.value = annotations.value.map(annotation => {
    if (annotation.type.toString() === annotationType.toString()) {
      annotation.style = { ...annotation.style, ...style }
    }
    return annotation
  })
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

.color-picker-panel {
  width: 200px;
  padding: 8px;
  
  .color-presets {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    margin-bottom: 8px;
    
    .color-preset {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
      
      &:hover {
        transform: scale(1.1);
      }
      
      &.active {
        border-color: #1890ff;
        box-shadow: 0 0 4px rgba(24, 144, 255, 0.5);
      }
    }
  }
  
  .custom-color {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
    
    input[type="color"] {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: none;
      
      &::-webkit-color-swatch-wrapper {
        padding: 0;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
      }
      
      &::-webkit-color-swatch {
        border: none;
        border-radius: 3px;
      }
    }
    
    span {
      font-size: 12px;
      color: #666;
    }
  }
}
</style>
