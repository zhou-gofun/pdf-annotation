<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue'
import { computePosition, flip } from '@floating-ui/dom'
import { annotationDefinitions, type IAnnotationType, PdfjsAnnotationEditorType } from '../const/definitions'


// Props
interface Props {
  onChange: (annotation: IAnnotationType | null, range: Range | null) => void
}
const props = defineProps<Props>()

// Ref 暴露方法
const containerRef = ref<HTMLDivElement | null>(null)
const show = ref(false)
const currentRange = ref<Range | null>(null)

// 获取高亮类型的注释
const annotations = computed<IAnnotationType[]>(() =>
  annotationDefinitions.filter(item => item.pdfjsEditorType === PdfjsAnnotationEditorType.HIGHLIGHT)
)


// 打开 Popbar
const open = async (range: Range | null) => {
  currentRange.value = range

  if (!range || (range.endContainer.nodeType !== 3 && range.startContainer.nodeType !== 3)) {
    show.value = false
    return
  }

  show.value = true

  const rect = range.endContainer.nodeType === 3
    ? range.endContainer.parentElement!.getBoundingClientRect()
    : range.startContainer.parentElement!.getBoundingClientRect()

  const virtualEl = {
    getBoundingClientRect() {
      return rect
    }
  }

  if (containerRef.value) {
    const { x, y } = await computePosition(virtualEl, containerRef.value, {
      placement: 'bottom',
      middleware: [flip()]
    })
    Object.assign(containerRef.value.style, {
      left: `${x}px`,
      top: `${y}px`
    })
  }
}

// 关闭 Popbar
const close = () => {
  show.value = false
  currentRange.value = null
}

// 点击注释按钮
const handleAnnotationClick = (annotation: IAnnotationType | null) => {
  show.value = false
  props.onChange(annotation, currentRange.value)
}

// 暴露方法给父组件
defineExpose({
  open,
  close
})
</script>

<template>
  <div
    ref="containerRef"
    :class="['CustomPopbar', show ? 'show' : 'hide']"
  >
    <ul class="buttons">
      <li v-for="(annotation, index) in annotations" :key="index" @click="handleAnnotationClick(annotation)">
        <div class="icon">{{ annotation.icon }}</div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
/* 可保留原来的 index.scss 样式 */
.CustomPopbar {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
    display: none;
    width: max-content;
    background-color: var(--doorhanger-bg-color);
    box-shadow:
        0 1px 5px var(--doorhanger-border-color),
        0 0 0 1px var(--doorhanger-border-color);
    border: var(--toolbar-border-color);
    border-radius: 6px;
    font: message-box;
    padding: 4px; // 增加基础内边距避免按钮贴边
    &.show {
        display: block;
    }

    .buttons {
        display: flex;
        gap: 4px;
        padding: 0;
        margin: 0;
        list-style: none;
        user-select: none;

        li {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 40px; // ✅ 固定宽度（可按实际图标宽度调整）
            height: 32px;
            padding: 0;
            border: 1px solid transparent;
            color: var(--main-color);
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.2s ease;

            .icon {
                font-size: 14px;
                line-height: 1;
            }

            &:hover {
                background-color: var(--button-hover-color);
            }

            &:active {
                background-color: var(--button-hover-color-active, #ccc);
            }
        }
    }
}

</style>
