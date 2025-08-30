<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue'
import { computePosition, flip } from '@floating-ui/dom'
import { annotationDefinitions, type IAnnotationType, PdfjsAnnotationEditorType } from '../const/definitions'


// Props
interface Props {
  onChange: (annotation: IAnnotationType | null, range: Range | null) => void
  onStyleChange?: (style: { color?: string; opacity?: number }) => void
}
const props = defineProps<Props>()

// Ref 暴露方法
const containerRef = ref<HTMLDivElement | null>(null)
const show = ref(false)
const currentRange = ref<Range | null>(null)
const selectedColor = ref('#ffff33')
const opacity = ref(50)
const isModifyMode = ref(false) // 新增：是否是修改模式

// 获取高亮类型的注释
const annotations = computed<IAnnotationType[]>(() => {
  const highlightAnnotations = annotationDefinitions.filter(item => item.pdfjsEditorType === PdfjsAnnotationEditorType.HIGHLIGHT)
  return highlightAnnotations
})

// 快速颜色选择
const quickColors = ['#ffff33', '#ff6666', '#66ff66', '#66ccff', '#ff9933', '#cc66ff']


// 打开 Popbar - 使用选择区域的实际边界矩形
const open = async (range: Range | null, isOnExistingAnnotation: boolean = false) => {
  currentRange.value = range
  
  // 如果 range 为空或 startContainer 和 endContainer 都不是文本节点，隐藏菜单
  if (!range || (range.endContainer.nodeType !== 3 && range.startContainer.nodeType !== 3)) {
    show.value = false
    return
  }

  show.value = true

  // 根据是否在现有注释上决定显示内容
  if (isOnExistingAnnotation) {
    // 在现有注释上时，显示修改工具(调色板)
    isModifyMode.value = true
  } else {
    // 在无注释文字上时，显示常规注释选择工具
    isModifyMode.value = false
  }

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
  isModifyMode.value = false // 重置修改模式
}

// 点击注释按钮
const handleAnnotationClick = (annotation: IAnnotationType | null) => {
  // 应用当前样式到注释
  if (annotation && props.onStyleChange) {
    props.onStyleChange({ color: selectedColor.value, opacity: opacity.value })
  }
  
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

// 处理颜色变化
const handleColorChange = (color: string) => {
  selectedColor.value = color
  if (props.onStyleChange) {
    props.onStyleChange({ color, opacity: opacity.value })
  }
}

// 处理透明度变化
const handleOpacityChange = (newOpacity: number) => {
  opacity.value = newOpacity
  if (props.onStyleChange) {
    props.onStyleChange({ color: selectedColor.value, opacity: newOpacity })
  }
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
    <!-- 修改模式：显示调色板 -->
    <template v-if="isModifyMode">
    </template>
    
    <!-- 普通模式：显示注释工具 -->
    <template v-else>
      <ul class="buttons">
        <li v-for="(annotation, index) in annotations" :key="index" @click="handleAnnotationClick(annotation)">
          <div class="icon">
            <component :is="annotation.icon" />
          </div>
        </li>
      </ul>
      
      <!-- 颜色和透明度控制 -->
      <div v-if="show" class="style-controls">
        <!-- 颜色选择 -->
        <div class="color-section">
          <div 
            v-for="color in quickColors" 
            :key="color"
            class="color-button"
            :style="{ backgroundColor: color }"
            :class="{ selected: selectedColor === color }"
            @click="handleColorChange(color)"
          />
        </div>
        
        <!-- 透明度控制 -->
        <div class="opacity-section">
          <span class="opacity-label">{{ opacity }}%</span>
          <input
            type="range"
            :value="opacity"
            min="10"
            max="100"
            step="10"
            class="opacity-slider"
            @input="handleOpacityChange(($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.CustomPopbar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 999999 !important;
    display: none;
    width: max-content;
    background-color: var(--doorhanger-bg-color, #fff);
    box-shadow:
        0 1px 5px var(--doorhanger-border-color, rgba(0,0,0,0.2)),
        0 0 0 1px var(--doorhanger-border-color, rgba(0,0,0,0.2));
    border: var(--toolbar-border-color, #ccc);
    border-radius: 6px;
    font: message-box;
    padding: 8px;
    pointer-events: auto;
    
    &.show {
        display: block !important;
    }

    .buttons {
        display: flex;
        gap: 4px;
        padding: 0;
        margin: 0 0 8px 0;
        list-style: none;
        user-select: none;

        li {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 34px;
            height: 26px;
            padding: 0;
            border: 1px solid transparent;
            color: var(--main-color);
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.2s ease;

            .icon {
                font-size: 18px;
                line-height: 1;
                display: flex;
                justify-content: center;
            }

            &:hover {
                background-color: var(--button-hover-color);
            }

            &:active {
                background-color: var(--button-hover-color-active, #ccc);
            }
        }
    }
    
    .style-controls {
        border-top: 1px solid #eee;
        padding-top: 8px;
        
        .color-section {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
            
            .color-button {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
                
                &:hover {
                    transform: scale(1.1);
                    border-color: #666;
                }
                
                &.selected {
                    border-color: #1976d2;
                    box-shadow: 0 0 4px rgba(25, 118, 210, 0.5);
                }
            }
        }
        
        .opacity-section {
            display: flex;
            align-items: center;
            gap: 8px;
            
            .opacity-label {
                font-size: 12px;
                color: #666;
                min-width: 30px;
            }
            
            .opacity-slider {
                width: 100px;
                height: 4px;
                background: linear-gradient(to right, transparent, currentColor);
                outline: none;
                border-radius: 2px;
                appearance: none;
                
                &::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #1976d2;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                &::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #1976d2;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
            }
        }
    }
}
</style>
