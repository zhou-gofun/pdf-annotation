<template>
  <div class="universal-color-panel" @click.stop>
    <!-- 颜色网格 -->
    <div class="color-grid" @click.stop>
      <!-- 第一行：淡色 -->
      <div class="color-row">
        <div
          v-for="color in lightColors"
          :key="color"
          class="color-cell"
          :style="{ backgroundColor: color }"
          :class="{ selected: selectedColor === color }"
          @click.stop="handleColorSelect(color)"
        />
      </div>
      <!-- 第二行：中色 -->
      <div class="color-row">
        <div
          v-for="color in mediumColors"
          :key="color"
          class="color-cell"
          :style="{ backgroundColor: color }"
          :class="{ selected: selectedColor === color }"
          @click.stop="handleColorSelect(color)"
        />
      </div>
      <!-- 第三行：深色 -->
      <div class="color-row">
        <div
          v-for="color in darkColors"
          :key="color"
          class="color-cell"
          :style="{ backgroundColor: color }"
          :class="{ selected: selectedColor === color }"
          @click.stop="handleColorSelect(color)"
        />
      </div>
      <!-- 第四行：灰度和黑白 -->
      <div class="color-row">
        <div
          v-for="color in grayColors"
          :key="color"
          class="color-cell"
          :style="{ backgroundColor: color }"
          :class="{ selected: selectedColor === color }"
          @click.stop="handleColorSelect(color)"
        />
      </div>
    </div>
    
    <!-- 自定义颜色区域 -->
    <div class="custom-section" @click.stop>
      <span class="custom-label">Custom</span>
      <div class="custom-colors">
        <!-- 已保存的自定义颜色 -->
        <div
          v-for="customColor in customColorsComputed"
          :key="customColor"
          class="custom-color-cell"
          :style="{ backgroundColor: customColor }"
          :class="{ selected: selectedColor === customColor }"
          @click.stop="handleColorSelect(customColor)"
        />
        <!-- 添加自定义颜色按钮 -->
        <button class="add-custom-btn" @click.stop="openCustomColorModal">
          <span>+</span>
        </button>
        <!-- 删除按钮（选中自定义颜色时显示） -->
        <button 
          v-if="isCustomColorSelected" 
          class="delete-custom-btn" 
          @click.stop="deleteSelectedCustomColor"
        >
          <span>🗑️</span>
        </button>
      </div>
    </div>
    
    <!-- 透明度控制 -->
    <div v-if="showOpacity" class="opacity-section" @click.stop>
      <span class="opacity-label">Opacity</span>
      <div class="opacity-control">
        <Slider
          v-model:value="opacityValue"
          :min="0"
          :max="100"
          @change="handleOpacityChange"
          class="opacity-slider"
        />
        <span class="opacity-value">{{ opacityValue }}%</span>
      </div>
    </div>
    
    <!-- 线宽控制 -->
    <div v-if="showStrokeWidth" class="stroke-width-section" @click.stop>
      <span class="stroke-label">{{ strokeWidthLabel }}</span>
      <div class="stroke-control">
        <Slider
          v-model:value="strokeWidthValue"
          :min="strokeWidthMin"
          :max="strokeWidthMax"
          :step="strokeWidthStep"
          @change="handleStrokeWidthChange"
          class="stroke-slider"
        />
        <span class="stroke-value">{{ strokeWidthValue }}</span>
      </div>
    </div>

    <!-- 自定义颜色选择器Modal -->
    <Modal
      :open="customColorModalVisible"
      title="选择自定义颜色"
      :width="480"
      :centered="true"
      :z-index="10000"
      :mask-closable="false"
      :keyboard="false"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleCustomColorConfirm"
      @cancel="handleCustomColorCancel"
      @click.stop
    >
      <div class="advanced-color-picker" @click.stop>
        <!-- 颜色渐变面板 -->
        <div class="color-gradient-panel">
          <div 
            class="saturation-panel" 
            ref="saturationPanel" 
            @mousedown="onSaturationMouseDown"
            @click.stop
            :style="{ background: `linear-gradient(to right, #fff, ${hueColor})` }"
          >
            <div class="saturation-overlay">
              <div class="saturation-pointer" :style="saturationPointerStyle"></div>
            </div>
          </div>
        </div>
        
        <!-- 色相条 -->
        <div class="hue-bar" ref="hueBar" @mousedown="onHueMouseDown" @click.stop>
          <div class="hue-pointer" :style="huePointerStyle"></div>
        </div>
        
        <!-- RGB/Hex输入框 -->
        <div class="color-inputs" @click.stop>
          <div class="input-group">
            <label>Hex</label>
            <input type="text" v-model="hexValue" @input="onHexChange" @click.stop />
          </div>
          <div class="input-group">
            <label>R</label>
            <input type="number" v-model="rgbValue.r" @input="onRgbChange" min="0" max="255" @click.stop />
          </div>
          <div class="input-group">
            <label>G</label>
            <input type="number" v-model="rgbValue.g" @input="onRgbChange" min="0" max="255" @click.stop />
          </div>
          <div class="input-group">
            <label>B</label>
            <input type="number" v-model="rgbValue.b" @input="onRgbChange" min="0" max="255" @click.stop />
          </div>
        </div>
        
        <!-- 颜色预览 -->
        <div class="color-preview" @click.stop>
          <div class="preview-color" :style="{ backgroundColor: tempCustomColor }"></div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits, defineProps, watch } from 'vue'
import { Slider, Modal } from 'ant-design-vue'
import { useColorPalette } from '../../store/colorPalette'

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
  customColors?: string[]
  toolType?: number // 新增：工具类型用于区分不同工具的设置
}

interface Emits {
  (e: 'colorChange', color: string): void
  (e: 'opacityChange', opacity: number): void
  (e: 'strokeWidthChange', strokeWidth: number): void
  (e: 'customColorAdd', color: string): void
  (e: 'customColorDelete', color: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedColor: '#000000',
  opacity: 100,
  strokeWidth: 1,
  showOpacity: true,
  showStrokeWidth: false,
  strokeWidthLabel: '线宽',
  strokeWidthMin: 0.5,
  strokeWidthMax: 5,
  strokeWidthStep: 0.5,
  customColors: () => [],
  toolType: 0
})

const emit = defineEmits<Emits>()

// 使用统一的调色板数据管理
const { 
  addCustomColor,
  deleteCustomColor,
  getCustomColors,
  getDefaultColors: getDefaultColorGrid
} = useColorPalette()

// 响应式数据
const opacityValue = ref(props.opacity)
const strokeWidthValue = ref(props.strokeWidth)
const customColorModalVisible = ref(false)
const tempCustomColor = ref('#ff0000')

// 颜色选择器相关状态
const saturationPanel = ref<HTMLElement>()
const hueBar = ref<HTMLElement>()
const hexValue = ref('C31313')
const rgbValue = ref({ r: 195, g: 19, b: 19 })
const hue = ref(0)
const saturation = ref(100)
const brightness = ref(76)
const saturationPointerStyle = ref({ left: '100%', top: '24%' })
const huePointerStyle = ref({ top: '0%' })
const hueColor = ref('#ff0000')

// 使用统一数据管理的默认颜色
const colorGrid = getDefaultColorGrid()

// 按照设计图定义的颜色网格 - 从统一数据管理中获取
// 第一行：淡色
const lightColors = computed(() => colorGrid[0])
// 第二行：中色  
const mediumColors = computed(() => colorGrid[1])
// 第三行：深色
const darkColors = computed(() => colorGrid[2])
// 第四行：灰度和黑白
const grayColors = computed(() => colorGrid[3])

// 计算属性 - 使用统一的自定义颜色数据
const customColorsComputed = computed(() => {
  if (props.toolType) {
    return getCustomColors(props.toolType)
  }
  return props.customColors || []
})

const isCustomColorSelected = computed(() => {
  return customColorsComputed.value.includes(props.selectedColor || '') || false
})

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

function openCustomColorModal() {
  customColorModalVisible.value = true
}

function handleCustomColorConfirm() {
  // 如果有工具类型，添加到统一数据管理中
  if (props.toolType) {
    addCustomColor(props.toolType, tempCustomColor.value)
  }
  
  emit('customColorAdd', tempCustomColor.value)
  emit('colorChange', tempCustomColor.value)
  customColorModalVisible.value = false
}

function handleCustomColorCancel() {
  customColorModalVisible.value = false
}

// 删除选中的自定义颜色
function deleteSelectedCustomColor() {
  if (props.selectedColor && customColorsComputed.value.includes(props.selectedColor)) {
    // 如果有工具类型，从统一数据管理中删除
    if (props.toolType) {
      deleteCustomColor(props.toolType, props.selectedColor)
    }
    
    emit('customColorDelete', props.selectedColor)
  }
}

// 更新色相颜色
function updateHueColor() {
  const h = hue.value
  const rgb = hsbToRgb(h, 100, 100)
  hueColor.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

// 颜色选择器事件处理
function onSaturationMouseDown(e: MouseEvent) {
  const rect = saturationPanel.value?.getBoundingClientRect()
  if (!rect) return
  
  const handleMouseMove = (e: MouseEvent) => {
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    
    saturation.value = x * 100
    brightness.value = (1 - y) * 100
    
    saturationPointerStyle.value = {
      left: `${x * 100}%`,
      top: `${y * 100}%`
    }
    
    updateColorFromHSB()
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  handleMouseMove(e)
}

function onHueMouseDown(e: MouseEvent) {
  const rect = hueBar.value?.getBoundingClientRect()
  if (!rect) return
  
  const handleMouseMove = (e: MouseEvent) => {
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    hue.value = y * 360
    
    huePointerStyle.value = { top: `${y * 100}%` }
    updateColorFromHSB()
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  handleMouseMove(e)
}

function updateColorFromHSB() {
  const rgb = hsbToRgb(hue.value, saturation.value, brightness.value)
  rgbValue.value = rgb
  hexValue.value = rgbToHex(rgb.r, rgb.g, rgb.b)
  tempCustomColor.value = `#${hexValue.value}`
  updateHueColor()
}

function onHexChange() {
  const hex = hexValue.value.replace('#', '')
  if (hex.length === 6 && /^[0-9A-Fa-f]+$/.test(hex)) {
    tempCustomColor.value = `#${hex}`
    const rgb = hexToRgb(hex)
    if (rgb) {
      rgbValue.value = rgb
      const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b)
      hue.value = hsb.h
      saturation.value = hsb.s
      brightness.value = hsb.b
      updatePointers()
    }
  }
}

function onRgbChange() {
  hexValue.value = rgbToHex(rgbValue.value.r, rgbValue.value.g, rgbValue.value.b)
  tempCustomColor.value = `#${hexValue.value}`
  const hsb = rgbToHsb(rgbValue.value.r, rgbValue.value.g, rgbValue.value.b)
  hue.value = hsb.h
  saturation.value = hsb.s
  brightness.value = hsb.b
  updatePointers()
}

function updatePointers() {
  saturationPointerStyle.value = {
    left: `${saturation.value}%`,
    top: `${100 - brightness.value}%`
  }
  huePointerStyle.value = { top: `${(hue.value / 360) * 100}%` }
}

// 颜色转换工具函数
function hsbToRgb(h: number, s: number, b: number) {
  s /= 100
  b /= 100
  const c = b * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = b - c
  let r = 0, g = 0, bl = 0
  
  if (h < 60) { r = c; g = x; bl = 0 }
  else if (h < 120) { r = x; g = c; bl = 0 }
  else if (h < 180) { r = 0; g = c; bl = x }
  else if (h < 240) { r = 0; g = x; bl = c }
  else if (h < 300) { r = x; g = 0; bl = c }
  else { r = c; g = 0; bl = x }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((bl + m) * 255)
  }
}

function rgbToHsb(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  let h = 0
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6
    else if (max === g) h = (b - r) / diff + 2
    else h = (r - g) / diff + 4
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360
  
  const s = max === 0 ? 0 : diff / max
  return { h, s: s * 100, b: max * 100 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

function hexToRgb(hex: string) {
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}
</script>

<style lang="scss" scoped>
.universal-color-panel {
  width: 150px;
  padding: 0px;
  background: white;
  
  .color-grid {
    margin-bottom: 12px;
    
    .color-row {
      display: flex;
      gap: 6px;
      margin-bottom: 3px;
      justify-content: flex-start;
      
      .color-cell {
        width: 15px;
        height: 15px;
        border-radius: 3px;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        flex-shrink: 0;
        &.selected {
          box-shadow: 0 0 4px rgba(25, 118, 210, 0.5);
        }
      }
    }
  }
  
  .custom-section {
    border-top: 1px solid #eee;
    padding-top: 8px;
    margin-bottom: 12px;
    
    .custom-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      display: block;
    }
    
    .custom-colors {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .add-custom-btn,
    .delete-custom-btn {
      width: 15px;
      height: 15px;
      border: 1px dashed #ccc;
      border-radius: 3px;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #666;
      padding: 0;
      
      &:hover {
        border-color: #1976d2;
        color: #1976d2;
      }
    }
    
    .delete-custom-btn {
      border-color: #ff4444;
      color: #ff4444;
      
      &:hover {
        border-color: #ff0000;
        color: #ff0000;
      }
    }
    
    .custom-color {
      display: flex;
      align-items: center;
      gap: 6px;
      
      .custom-label {
        font-size: 12px;
        color: #666;
        min-width: 45px;
      }
      
      .custom-btn {
        width: 24px;
        height: 18px;
        border: 1px dashed #ccc;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #666;
        
        &:hover {
          border-color: #1976d2;
          color: #1976d2;
        }
      }
      
      .custom-color-cell {
        width: 15px;
        height: 15px;
        border-radius: 3px;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        
        &.selected {
          box-shadow: 0 0 4px rgba(25, 118, 210, 0.5);
        }
      }
    }
    
    .custom-color-cell {
      width: 15px;
      height: 15px;
      border-radius: 3px;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      flex-shrink: 0;
      
      &.selected {
        box-shadow: 0 0 4px rgba(25, 118, 210, 0.5);
      }
    }
  }
  
  .opacity-section,
  .stroke-width-section {
    display: block;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    
    .opacity-label,
    .stroke-label {
      color: #666;
      min-width: 45px;
    }
    
    .opacity-value,
    .stroke-value {
      min-width: 35px;
      color: #666;
      text-align: right;
    }
    
    .ant-slider {
      flex: 1;
      margin: 0px 5px 0px 0px !important;
    }
  }

  .opacity-control {
    display: flex;
    align-items: center;
  }
}

.custom-color-picker {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.advanced-color-picker {
  display: flex;
  gap: 16px;
  
  .color-gradient-panel {
    width: 200px;
    height: 150px;
    position: relative;
    background: linear-gradient(to right, #fff, #ff0000);
    cursor: crosshair;
    
    .saturation-panel {
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(to right, #fff, transparent),
                  linear-gradient(to bottom, transparent, #000);
      
      .saturation-overlay {
        width: 100%;
        height: 100%;
        position: relative;
        
        .saturation-pointer {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 3px rgba(0,0,0,0.5);
          pointer-events: none;
        }
      }
    }
  }
  
  .hue-bar {
    width: 20px;
    height: 150px;
    position: relative;
    background: linear-gradient(to bottom, 
      #ff0000 0%, #ffff00 16.66%, #00ff00 33.33%, 
      #00ffff 50%, #0000ff 66.66%, #ff00ff 83.33%, #ff0000 100%);
    cursor: pointer;
    
    .hue-pointer {
      position: absolute;
      width: 20px;
      height: 4px;
      border: 2px solid #fff;
      transform: translateY(-50%);
      box-shadow: 0 0 3px rgba(0,0,0,0.5);
      pointer-events: none;
    }
  }
  
  .color-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      
      label {
        min-width: 30px;
        font-size: 12px;
        color: #666;
      }
      
      input {
        width: 60px;
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        
        &[type="text"] {
          width: 80px;
        }
      }
    }
  }
  
  .color-preview {
    width: 40px;
    display: flex;
    flex-direction: column;
    
    .preview-color {
      width: 40px;
      height: 40px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  }
}
</style>