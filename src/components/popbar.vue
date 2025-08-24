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
const annotations = computed<IAnnotationType[]>(() => {
  const highlightAnnotations = annotationDefinitions.filter(item => item.pdfjsEditorType === PdfjsAnnotationEditorType.HIGHLIGHT)
  return highlightAnnotations
})


// 打开 Popbar - 使用选择区域的实际边界矩形
const open = async (range: Range | null) => {
  currentRange.value = range
  
  // 如果 range 为空或 startContainer 和 endContainer 都不是文本节点，隐藏菜单
  if (!range || (range.endContainer.nodeType !== 3 && range.startContainer.nodeType !== 3)) {
    show.value = false
    return
  }

  show.value = true

  // 获取选择区域的实际边界矩形
  const rangeRect = range.getBoundingClientRect()
  
  // 创建虚拟元素用于计算位置，使用选择区域的边界矩形
  const virtualEl = {
    getBoundingClientRect() {
      return {
        width: rangeRect.width,
        height: rangeRect.height,
        x: rangeRect.x,
        y: rangeRect.y,
        left: rangeRect.left,
        right: rangeRect.right,
        top: rangeRect.top,
        bottom: rangeRect.bottom
      }
    }
  }

  // 计算位置并调整菜单位置，确保在选择区域正下方居中
  if (containerRef.value) {
    const { x: posX, y: posY } = await computePosition(virtualEl, containerRef.value, {
      placement: 'bottom',
      middleware: [flip()]
    })
    
    Object.assign(containerRef.value.style, {
      left: `${posX}px`,
      top: `${posY}px`
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
  // 先调用父组件的onChange回调处理annotation
  props.onChange(annotation, currentRange.value)
  
  // 清除文本选择 - 这会触发selectionchange事件，进而通过webSelection系统隐藏popbar
  const selection = window.getSelection()
  if (selection) {
    selection.removeAllRanges()
  }
  
  // 本地状态清理
  show.value = false
  currentRange.value = null
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
        <div class="icon">
          <component :is="annotation.icon" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
/* 可保留原来的 index.scss 样式 */
.CustomPopbar {
    position: fixed; /* 改为 fixed 定位，因为现在挂载在 body 上 */
    top: 0;
    left: 0;
    z-index: 999999 !important; /* 提高 z-index 确保显示在最上层 */
    display: none;
    width: max-content;
    background-color: var(--doorhanger-bg-color, #fff); /* 添加后备颜色 */
    box-shadow:
        0 1px 5px var(--doorhanger-border-color, rgba(0,0,0,0.2)),
        0 0 0 1px var(--doorhanger-border-color, rgba(0,0,0,0.2));
    border: var(--toolbar-border-color, #ccc);
    border-radius: 6px;
    font: message-box;
    padding: 4px; // 增加基础内边距避免按钮贴边
    pointer-events: auto; /* 确保可以点击 */
    &.show {
        display: block !important; /* 确保显示 */
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
