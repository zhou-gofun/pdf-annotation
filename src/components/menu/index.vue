<script setup lang="ts">
import { ref, computed, nextTick, defineExpose } from 'vue'
import { computePosition, flip } from '@floating-ui/dom'
import Konva from 'konva'
import { annotationDefinitions, type IAnnotationStore, type IAnnotationStyle } from '../../const/definitions'
import type { IRect } from 'konva/lib/types'
import { AnnoIcon, DeleteIcon, PaletteIcon } from '../../const/icon'
import { defaultOptions } from '../../const/default_options'
import { PAINTER_WRAPPER_PREFIX } from '../../painter/const'
import ColorPanel from '../common/ColorPanel.vue'

// ---------------- props ----------------
interface Props {
  onOpenComment: (annotation: IAnnotationStore) => void
  onChangeStyle: (annotation: IAnnotationStore, styles: IAnnotationStyle) => void
  onDelete: (annotation: IAnnotationStore) => void
}
const props = defineProps<Props>()

// ---------------- refs ----------------
const containerRef = ref<HTMLElement | null>(null)
const show = ref(false)
const showStyle = ref(false)

const currentAnnotation = ref<IAnnotationStore | null>(null)
const currentColor = ref<string | null>(defaultOptions.setting.COLOR)
const strokeWidth = ref<number>(defaultOptions.setting.STROKE_WIDTH)
const opacity = ref<number>(defaultOptions.setting.OPACITY)

// 自定义颜色管理
const customColors = ref<string[]>([])


// ---------------- expose ----------------
interface CustomAnnotationMenuRef {
  open(annotation: IAnnotationStore, selectorRect: IRect): void
  close(): void
}
defineExpose<CustomAnnotationMenuRef>({
  open,
  close
})

// ---------------- helper ----------------
function getKonvaShapeForString(konvaString: string) {
  const ghostGroup = Konva.Node.create(konvaString)
  return ghostGroup.children[0]
}

const isStyleSupported = computed(() => {
  if (!currentAnnotation.value) return null
  return annotationDefinitions.find(item => item.type === currentAnnotation.value!.type)?.styleEditable
})

// ---------------- actions ----------------
function open(annotation: IAnnotationStore, selectorRect: IRect) {
  currentAnnotation.value = annotation
  show.value = true

  const currentShape = getKonvaShapeForString(annotation.konvaString)
  currentColor.value = currentShape.stroke()
  strokeWidth.value = currentShape.strokeWidth()
  opacity.value = currentShape.opacity() * 100

  nextTick(() => {
    const menuEl = containerRef.value
    if (!menuEl) return

    const wrapperId = `${PAINTER_WRAPPER_PREFIX}_page_${annotation.pageNumber}`
    const konvaContainer = document.querySelector(`#${wrapperId} .konvajs-content`) as HTMLElement
    const containerRect = konvaContainer?.getBoundingClientRect?.()

    const scaleX = 1
    const scaleY = 1
    const realX = selectorRect.x * scaleX + containerRect.left
    const realY = selectorRect.y * scaleY + containerRect.top

    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: realX,
          y: realY,
          width: selectorRect.width * scaleX,
          height: selectorRect.height * scaleY,
          left: realX,
          top: realY,
          right: realX + selectorRect.width * scaleX,
          bottom: realY + selectorRect.height * scaleY,
        }
      }
    }

    computePosition(virtualEl, menuEl, {
      placement: 'bottom',
      middleware: [flip()],
    }).then(({ x, y }) => {
      Object.assign(menuEl.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
      })
    })
  })
}

function close() {
  show.value = false
  showStyle.value = false
  currentAnnotation.value = null
}

function handleAnnotationStyleChange(style: IAnnotationStyle) {
  if (!currentAnnotation.value) return
  props.onChangeStyle(currentAnnotation.value, style)
}

// 颜色相关方法
function handleColorChange(color: string) {
  currentColor.value = color
  // 实时更新注释样式
  handleAnnotationStyleChange({ color })
}

function handleOpacityChange(opacityVal: number) {
  opacity.value = opacityVal
  // 实时更新注释样式
  handleAnnotationStyleChange({ opacity: opacityVal / 100 })
}

function handleStrokeWidthChange(strokeVal: number) {
  strokeWidth.value = strokeVal
  // 实时更新注释样式
  handleAnnotationStyleChange({ strokeWidth: strokeVal })
}

function handleCustomColorAdd(color: string) {
  // 添加到自定义颜色列表
  if (!customColors.value.includes(color)) {
    customColors.value.push(color)
  }
}

function handleCustomColorDelete(color: string) {
  // 从自定义颜色列表中删除
  const index = customColors.value.indexOf(color)
  if (index > -1) {
    customColors.value.splice(index, 1)
  }
}

</script>

<template>
  <div class="CustomAnnotationMenu" :class="{ show: show, hide: !show }" ref="containerRef">
    <!-- 按钮面板 -->
    <ul v-if="!showStyle && currentAnnotation" class="buttons">
      <li @mousedown.prevent="() => { props.onOpenComment(currentAnnotation as IAnnotationStore); close() }">
        <div class="icon"><AnnoIcon /></div>
      </li>

      <li v-if="isStyleSupported" @mousedown.prevent="showStyle = true">
        <div class="icon"><PaletteIcon /></div>
      </li>

      <li @mousedown.prevent="() => { props.onDelete(currentAnnotation as IAnnotationStore); close() }">
        <div class="icon"><DeleteIcon /></div>
      </li>
    </ul>
    
    <!-- 直接显示的调色板 -->
    <div v-if="showStyle && currentAnnotation" class="color-panel-container">
      <ColorPanel
        :selected-color="currentColor || '#000000'"
        :opacity="opacity"
        :stroke-width="strokeWidth"
        :show-opacity="!!isStyleSupported?.opacity"
        :show-stroke-width="!!isStyleSupported?.strokeWidth"
        :stroke-width-label="'线宽'"
        :stroke-width-min="1"
        :stroke-width-max="20"
        :stroke-width-step="1"
        :custom-colors="customColors"
        @color-change="handleColorChange"
        @opacity-change="handleOpacityChange"
        @stroke-width-change="handleStrokeWidthChange"
        @custom-color-add="handleCustomColorAdd"
        @custom-color-delete="handleCustomColorDelete"
      />
    </div>
  </div>
</template>
<style scoped lang="scss">
@use './index.scss' as *;
</style>
