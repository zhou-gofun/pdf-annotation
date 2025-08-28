<template>
  <div class="unified-color-picker">
    <!-- 颜色网格 -->
    <div class="color-grid">
      <div class="color-row" v-for="(row, rowIndex) in colorGrid" :key="rowIndex">
        <div
          v-for="gridColor in row"
          :key="gridColor"
          class="color-cell"
          :style="{ backgroundColor: gridColor }"
          :class="{ selected: selectedColor === gridColor }"
          @click="handleColorSelect(gridColor)"
        />
      </div>
    </div>
    
    <!-- 自定义颜色和透明度区域 -->
    <div class="custom-section">
      <div class="custom-color">
        <button class="custom-btn" @click="openCustomColorPicker">
          <span>+</span>
        </button>
        <span>Custom</span>
      </div>
      
      <!-- 透明度控制 -->
      <div v-if="showOpacity" class="opacity-section">
        <span>Opacity</span>
        <Slider
          v-model:value="opacityValue"
          :min="0"
          :max="100"
          @change="handleOpacityChange"
        />
        <span>{{ opacityValue }}%</span>
      </div>
      
      <!-- 线宽控制 -->
      <div v-if="showStrokeWidth" class="stroke-width-section">
        <span>{{ strokeWidthLabel }}</span>
        <Slider
          v-model:value="strokeWidthValue"
          :min="strokeWidthMin"
          :max="strokeWidthMax"
          :step="strokeWidthStep"
          @change="handleStrokeWidthChange"
        />
        <span>{{ strokeWidthValue }}</span>
      </div>
    </div>

    <!-- 隐藏的原生颜色输入框 -->
    <input
      ref="colorInput"
      type="color"
      style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;"
      :value="selectedColor || '#000000'"
      @input="handleCustomColorChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, watch } from 'vue'
import { Slider } from 'ant-design-vue'

interface Props {
  selectedColor?: string
  opacity?: number
  strokeWidth?: number
  showOpacity?: boolean
  showStrokeWidth?: boolean
  strokeWidthLabel?: string
  strokeWidthMin?: number
  strokeWidthMax?: number
  strokeWidthStep?: number
}

interface Emits {
  (e: 'colorChange', color: string): void
  (e: 'opacityChange', opacity: number): void
  (e: 'strokeWidthChange', strokeWidth: number): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedColor: '#000000',
  opacity: 100,
  strokeWidth: 1,
  showOpacity: false,
  showStrokeWidth: false,
  strokeWidthLabel: '线宽',
  strokeWidthMin: 1,
  strokeWidthMax: 5,
  strokeWidthStep: 0.5
})

const emit = defineEmits<Emits>()

// 响应式数据
const colorInput = ref<HTMLInputElement>()
const opacityValue = ref(props.opacity)
const strokeWidthValue = ref(props.strokeWidth)

// 颜色网格配置 - 与CustomToolbar中的保持一致
const colorGrid = [
  ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#c9baff', '#ffbaff', '#ffb3ba'],
  ['#ff7f7f', '#ffbf7f', '#ffff7f', '#7fff9f', '#7fcfff', '#9f7fff', '#ff7fff', '#ff7f7f'],
  ['#8b0000', '#ff8c00', '#ffd700', '#008000', '#008b8b', '#000080', '#800080', '#8b0000'],
  ['#696969', '#a9a9a9', '#000000', '#000000', '#000000', '#000000', '#000000', '#ffffff']
]

// 监听props变化
watch(() => props.opacity, (newVal) => {
  opacityValue.value = newVal
})

watch(() => props.strokeWidth, (newVal) => {
  strokeWidthValue.value = newVal
})

// 方法
function handleColorSelect(color: string) {
  emit('colorChange', color)
}

function handleOpacityChange(value: number | [number, number]) {
  const opacityVal = Array.isArray(value) ? value[0] : value
  opacityValue.value = opacityVal
  emit('opacityChange', opacityVal)
}

function handleStrokeWidthChange(value: number | [number, number]) {
  const strokeVal = Array.isArray(value) ? value[0] : value
  strokeWidthValue.value = strokeVal
  emit('strokeWidthChange', strokeVal)
}

function openCustomColorPicker() {
  if (colorInput.value) {
    colorInput.value.click()
  }
}

function handleCustomColorChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('colorChange', target.value)
}
</script>

<style lang="scss" scoped>
.unified-color-picker {
  width: 240px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  .color-grid {
    margin-bottom: 12px;
    
    .color-row {
      display: flex;
      gap: 2px;
      margin-bottom: 2px;
      
      .color-cell {
        width: 20px;
        height: 20px;
        min-width: 20px;
        min-height: 20px;
        border-radius: 3px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        
        &:hover {
          transform: scale(1.1);
          border: 1px solid #1976d2;
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
    
    .opacity-section,
    .stroke-width-section {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      margin-top: 8px;
      
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