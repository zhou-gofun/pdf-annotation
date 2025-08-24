<template>
    <a-popover
      trigger="click"
      placement="bottom"
      :arrow="false"
      v-model:open="isPopoverOpen"
      overlayClassName="SignaturePop"
    >
      <template #content>
        <div>
          <ul class="SignaturePop-Container">
            <li v-for="(s, idx) in signatures" :key="idx">
              <img :src="s" @click="handleAdd(s)" />
            </li>
          </ul>
          <div class="SignaturePop-Toolbar">
            <a-button block type="link" @click="openModal" :icon="h(PlusCircleOutlined)">
              {{ t('toolbar.buttons.createSignature') }}
            </a-button>
          </div>
        </div>
      </template>
  
      <div class="icon">
        <component :is="annotation.icon" />
      </div>
      <!-- <div class="name">{{ t(`annotations.${annotation.name}`) }}</div> -->
    </a-popover>
  
    <a-modal
      v-model:open="isModalOpen"
      :title="t('toolbar.buttons.createSignature')"
      :okText="t('normal.ok')"
      :cancelText="t('normal.cancel')"
      destroyOnClose
      :okButtonProps="{ disabled: isOKButtonDisabled }"
      @ok="handleOk"
    >
      <div>
        <div class="SignatureTool-Header">
          <a-radio-group
            v-model:value="signatureType"
            button-style="solid"
          >
            <a-radio-button value="Draw">{{ t('normal.draw') }}</a-radio-button>
            <a-radio-button value="Enter">{{ t('normal.enter') }}</a-radio-button>
            <a-radio-button value="Upload">{{ t('normal.upload') }}</a-radio-button>
          </a-radio-group>
        </div>
  
        <div class="SignatureTool-Container" :style="{ width: defaultOptions.signature.WIDTH + 'px' }">
          <!-- Enter 模式 -->
          <input
            v-if="signatureType === 'Enter'"
            autofocus
            type="text"
            v-model="typedSignature"
            :placeholder="t('toolbar.message.signatureArea')"
            :style="{
              height: defaultOptions.signature.HEIGHT + 'px',
              width: defaultOptions.signature.WIDTH / 1.1 + 'px',
              color: currentColor,
              fontFamily: fontFamily,
              fontSize: BASE_FONT_SIZE + 'px',
              lineHeight: BASE_FONT_SIZE + 'px'
            }"
          />
  
          <!-- Draw 模式 -->
          <div v-else-if="signatureType === 'Draw'">
            <div class="SignatureTool-Container-info">{{ t('toolbar.message.signatureArea') }}</div>
            <div
              ref="containerRef"
              :style="{
                height: defaultOptions.signature.HEIGHT + 'px',
                width: defaultOptions.signature.WIDTH + 'px'
              }"
            />
          </div>
  
          <!-- Upload 模式 -->
          <div v-else-if="signatureType === 'Upload'"
            :style="{ height: defaultOptions.signature.HEIGHT + 'px', width: defaultOptions.signature.WIDTH + 'px' }">
            <div
              v-if="uploadedImageUrl"
              class="SignatureTool-ImagePreview"
              :style="{ height: defaultOptions.signature.HEIGHT + 'px', width: defaultOptions.signature.WIDTH + 'px' }"
            >
              <img :src="uploadedImageUrl" alt="preview" />
            </div>
            <a-upload-dragger
              v-else
              :accept="defaultOptions.signature.ACCEPT"
              :beforeUpload="() => false"
              :showUploadList="false"
              :multiple="false"
              @change="handleUploadChange"
              :style="{ height: defaultOptions.signature.HEIGHT + 'px', width: defaultOptions.signature.WIDTH + 'px' }"
            >
              <p class="ant-upload-drag-icon"></p>
              <p class="ant-upload-text">{{ t('toolbar.message.uploadArea') }}</p>
              <p class="ant-upload-hint">
                {{ t('toolbar.message.uploadHint', { format: defaultOptions.signature.ACCEPT, maxSize: formatFileSize(defaultOptions.signature.MAX_SIZE) }) }}
              </p>
            </a-upload-dragger>
          </div>
        </div>
  
        <!-- 工具栏 -->
        <div class="SignatureTool-Toolbar" :style="{ width: defaultOptions.signature.WIDTH + 'px' }">
          <div class="colorPalette">
            <template v-if="signatureType !== 'Upload'">
              <div
                v-for="color in defaultOptions.signature.COLORS"
                :key="color"
                @click="changeColor(color)"
                :class="['cell', { active: color === currentColor }]"
              >
                <span :style="{ backgroundColor: color }" />
              </div>
            </template>
  
            <a-select
              v-if="signatureType === 'Enter'"
              size="small"
              style="width: 160px"
              v-model:value="fontFamily"
              :options="defaultOptions.handwritingFontList"
              @change="loadFont"
            />
          </div>
          <div class="clear" @click="handleClear">{{ t('normal.clear') }}</div>
        </div>
      </div>
    </a-modal>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, nextTick, h } from 'vue'
  import { useI18n } from 'vue-i18n'
  import Konva from 'konva'
  import { PlusCircleOutlined } from '@ant-design/icons-vue'
  import { defaultOptions } from '../../const/default_options'
  import type { IAnnotationType } from '../../const/definitions'
  import { formatFileSize } from '../../utils/utils'
  import { loadFontWithFontFace } from '../../utils/fontLoader'
  import type { UploadChangeParam } from 'ant-design-vue'
  import type { UploadFile } from 'ant-design-vue/es/upload/interface'
  
  const BASE_FONT_SIZE = 80
  
  interface Props {
    annotation: IAnnotationType
  }
  const { annotation } = defineProps<Props>()
  
  const emit = defineEmits<{
    (e: 'add', dataUrl: string): void
  }>()
  
  const { t } = useI18n()
  
  // refs & state
  const containerRef = ref<HTMLDivElement | null>(null)
  const konvaStageRef = ref<Konva.Stage | null>(null)
  const colorRef = ref(defaultOptions.signature.COLORS[0])
  
  const isPopoverOpen = ref(false)
  const isModalOpen = ref(false)
  const currentColor = ref(colorRef.value)
  const isOKButtonDisabled = ref(true)
  const signatures = ref<string[]>([])
  const signatureType = ref<string | null>(null)
  const typedSignature = ref('')
  const fontFamily = ref(defaultOptions.handwritingFontList[0].value || 'Arial')
  const uploadedImageUrl = ref<string | null>(null)
  const maxSize = defaultOptions.signature.MAX_SIZE

  // methods
  function handleAdd(signature: string) {
    emit('add', signature)
    isPopoverOpen.value = false
  }
  function openModal() {
    isPopoverOpen.value = false
    isModalOpen.value = true
  }

  async function loadFont(fontValue: string) {
    const fontItem = defaultOptions.handwritingFontList.find(item => item.value === fontValue);
    if (fontItem) {
    await loadFontWithFontFace(fontItem);
    }
    fontFamily.value = fontValue
  }
  function generateTypedSignatureImage(): string | null {
    if (!typedSignature.value.trim()) return null
    const canvas = document.createElement('canvas')
    canvas.width = defaultOptions.signature.WIDTH / 1.1
    canvas.height = defaultOptions.signature.HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
  
    const padding = 20
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = `${BASE_FONT_SIZE}px "${fontFamily.value}", cursive, sans-serif`
  
    let textWidth = ctx.measureText(typedSignature.value).width
    const scale = textWidth + padding * 2 > canvas.width ? (canvas.width - padding * 2) / textWidth : 1
    ctx.font = `${BASE_FONT_SIZE * scale}px "${fontFamily.value}", cursive, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = currentColor.value
    ctx.fillText(typedSignature.value, canvas.width / 2, canvas.height / 2)
    return canvas.toDataURL('image/png')
  }
  function handleOk() {
    if (signatureType.value === 'Upload' && uploadedImageUrl.value) {
      signatures.value.push(uploadedImageUrl.value)
      handleAdd(uploadedImageUrl.value)
      isModalOpen.value = false
    } else if (signatureType.value === 'Enter') {
      const dataUrl = generateTypedSignatureImage()
      if (dataUrl) {
        signatures.value.push(dataUrl)
        handleAdd(dataUrl)
        isModalOpen.value = false
      }
    } else if (signatureType.value === 'Draw') {
      const dataUrl = konvaStageRef.value?.toDataURL()
      if (dataUrl) {
        signatures.value.push(dataUrl)
        handleAdd(dataUrl)
        isModalOpen.value = false
      }
    }
  }
  function handleClear() {
    const stage = konvaStageRef.value
    if (stage) {
      stage.clear()
      stage.getLayers().forEach(layer => layer.destroyChildren())
      isOKButtonDisabled.value = true
    }
    typedSignature.value = ''
    uploadedImageUrl.value = null
  }
  function initializeKonvaStage() {
    if (!containerRef.value) return
    const stage = new Konva.Stage({
      container: containerRef.value,
      width: defaultOptions.signature.WIDTH,
      height: defaultOptions.signature.HEIGHT
    })
    const layer = new Konva.Layer()
    stage.add(layer)
    konvaStageRef.value = stage
  
    let isPainting = false
    let lastLine: Konva.Line | null = null
    stage.on('mousedown touchstart', () => {
      isPainting = true
      const pos = stage.getPointerPosition()
      if (!pos) return
      lastLine = new Konva.Line({
        stroke: colorRef.value,
        strokeWidth: 3,
        globalCompositeOperation: 'source-over',
        lineCap: 'round',
        lineJoin: 'round',
        points: [pos.x, pos.y]
      })
      layer.add(lastLine)
    })
    stage.on('mouseup touchend', () => {
      isPainting = false
      lastLine = null
    })
    stage.on('mousemove touchmove', e => {
      if (!isPainting || !lastLine) return
      e.evt.preventDefault()
      const pos = stage.getPointerPosition()
      if (!pos) return
      const newPoints = lastLine.points().concat([pos.x, pos.y])
      lastLine.points(newPoints)
      isOKButtonDisabled.value = false
    })
  }
  function changeColor(color: string) {
    currentColor.value = color
    const allLines = konvaStageRef.value?.getLayers()[0]?.getChildren(node => node.getClassName() === 'Line') || []
    allLines.forEach(line => (line as Konva.Line).stroke(color))
  }
  function handleUploadChange(info: UploadChangeParam<UploadFile>) {
    const file = info.file as UploadFile
    if (!file || !(file as any).type?.startsWith('image/')) return
    if ((file.size as number) > maxSize) {
      alert(t('normal.fileSizeLimit', { value: formatFileSize(maxSize) }))
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const imageUrl = e.target?.result as string
      const img = new Image()
      img.src = imageUrl
      img.onload = () => {
        const MAX_WIDTH = defaultOptions.setting.MAX_UPLOAD_IMAGE_SIZE
        const MAX_HEIGHT = defaultOptions.setting.MAX_UPLOAD_IMAGE_SIZE
        let { width, height } = img
        if (width > height && width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width)
          width = MAX_WIDTH
        } else if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height)
          height = MAX_HEIGHT
        }
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        const pngDataUrl = canvas.toDataURL('image/png')
        uploadedImageUrl.value = pngDataUrl
        isOKButtonDisabled.value = false
      }
    }
    reader.readAsDataURL(file as any)
  }
  
  // watchers
  watch(signatureType, async val => {
    typedSignature.value = ''
    uploadedImageUrl.value = null
    isOKButtonDisabled.value = true
    if (val === 'Draw' && isModalOpen.value) {
      await nextTick()
      setTimeout(() => initializeKonvaStage(), 300)
    } else {
      konvaStageRef.value?.destroy()
      konvaStageRef.value = null
    }
  })
  watch(typedSignature, val => {
    if (signatureType.value === 'Enter') {
      isOKButtonDisabled.value = val.trim().length === 0
    }
  })
  watch(isModalOpen, val => {
    if (val) {
      loadFont(fontFamily.value)
      signatureType.value = defaultOptions.signature.TYPE
    }
  })
  </script>
  
<style lang="scss" scoped>
@use './index.scss' as *;
</style>
  