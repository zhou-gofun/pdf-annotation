<template>
  <Modal
    :open="visible"
    :title="title"
    :width="280"
    :centered="true"
    :mask-closable="false"
    :keyboard="false"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <ColorPicker
      :selected-color="selectedColor"
      :opacity="opacity"
      :stroke-width="strokeWidth"
      :show-opacity="showOpacity"
      :show-stroke-width="showStrokeWidth"
      :stroke-width-label="strokeWidthLabel"
      :stroke-width-min="strokeWidthMin"
      :stroke-width-max="strokeWidthMax"
      :stroke-width-step="strokeWidthStep"
      @color-change="handleColorChange"
      @opacity-change="handleOpacityChange"
      @stroke-width-change="handleStrokeWidthChange"
    />
  </Modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import ColorPicker from './ColorPicker.vue'

interface Props {
  visible: boolean
  title?: string
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
  (e: 'update:visible', visible: boolean): void
  (e: 'colorChange', color: string): void
  (e: 'opacityChange', opacity: number): void
  (e: 'strokeWidthChange', strokeWidth: number): void
  (e: 'confirm', data: { color: string; opacity: number; strokeWidth: number }): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '颜色设置',
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

// 内部状态
const currentColor = ref(props.selectedColor)
const currentOpacity = ref(props.opacity)
const currentStrokeWidth = ref(props.strokeWidth)

// 监听props变化
watch(() => props.selectedColor, (newVal) => {
  currentColor.value = newVal
})

watch(() => props.opacity, (newVal) => {
  currentOpacity.value = newVal
})

watch(() => props.strokeWidth, (newVal) => {
  currentStrokeWidth.value = newVal
})

// 事件处理
function handleColorChange(color: string) {
  currentColor.value = color
  emit('colorChange', color)
}

function handleOpacityChange(opacity: number) {
  currentOpacity.value = opacity
  emit('opacityChange', opacity)
}

function handleStrokeWidthChange(strokeWidth: number) {
  currentStrokeWidth.value = strokeWidth
  emit('strokeWidthChange', strokeWidth)
}

function handleOk() {
  emit('confirm', {
    color: currentColor.value,
    opacity: currentOpacity.value,
    strokeWidth: currentStrokeWidth.value
  })
  emit('update:visible', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
:deep(.ant-modal-body) {
  padding: 16px 24px;
}

:deep(.ant-modal-footer) {
  padding: 10px 16px;
}
</style>