<script setup lang="ts">
import { ref, computed, nextTick, defineExpose } from 'vue'
import { computePosition, flip } from '@floating-ui/dom'
import Konva from 'konva'
import { annotationDefinitions, type IAnnotationStore, type IAnnotationStyle } from '../../const/definitions'
import type { IRect } from 'konva/lib/types'
import { AnnoIcon, DeleteIcon, PaletteIcon } from '../../const/icon'
import { defaultOptions } from '../../const/default_options'
import { isSameColor } from '../../utils/utils'
import { useI18n } from 'vue-i18n'
import { PAINTER_WRAPPER_PREFIX } from '../../painter/const'
import { Divider, Form, Slider } from 'ant-design-vue'

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

const { t } = useI18n()

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
</script>

<template>
  <div class="CustomAnnotationMenu" :class="{ show: show, hide: !show }" ref="containerRef">
    <!-- 样式面板 -->
    <div v-if="showStyle && currentAnnotation" class="styleContainer">
      <!-- 颜色 -->
      <div v-if="isStyleSupported?.color" class="colorPalette">
        <div
          v-for="color in defaultOptions.colors"
          :key="color"
          class="cell"
          :class="{ active: isSameColor(color, currentColor || '') }"
          @mousedown.prevent="() => { handleAnnotationStyleChange({ color }); currentColor = color }"
        >
          <span :style="{ backgroundColor: color }"></span>
        </div>
      </div>

      <!-- strokeWidth & opacity -->
      <template v-if="isStyleSupported?.strokeWidth || isStyleSupported?.opacity">
        <Divider size="small" />
        <div class="prototypeSetting">
          <Form layout="vertical">
            <Form.Item v-if="isStyleSupported?.strokeWidth" :label="`${t('normal.strokeWidth')} (${strokeWidth})`">
              <Slider
                v-model:value="strokeWidth"
                :min="1"
                :max="20"
                @change="value => handleAnnotationStyleChange({ strokeWidth: Number(value) })"
              />
            </Form.Item>
            <Form.Item v-if="isStyleSupported?.opacity" :label="`${t('normal.opacity')} (${opacity}%)`">
              <Slider
                v-model:value="opacity"
                :min="0"
                :max="100"
                @change="value => handleAnnotationStyleChange({ opacity: Number(value) / 100 })"
              />
            </Form.Item>
          </Form>
        </div>
      </template>
    </div>

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
  </div>
</template>
<style scoped lang="scss">
@use './index.scss' as *;
</style>
