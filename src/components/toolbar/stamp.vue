<template>
  <div v-if="inline" class="StampInline">
    <div class="panel">
      <a-radio-group v-model:value="stampType" button-style="solid" size="small" class="tabs">
        <a-radio-button value="default">Standard</a-radio-button>
        <a-radio-button value="custom">Custom</a-radio-button>
      </a-radio-group>
      <div class="grid" v-if="stampType === 'default'">
        <div v-for="(stamp, idx) in defaultStamps" :key="idx" class="chip" @click="handleAdd(stamp.url)" :style="{ borderColor: '#3b5998', color: '#3b5998' }">
          {{ (stamp as any).label ?? 'STAMP' }}
        </div>
      </div>
      <div v-else class="grid">
        <div v-for="(stamp, idx) in customStamps" :key="idx" class="chip">
          <img :src="stamp" @click="handleAdd(stamp)" />
          <a-button type="text" size="small" @click="() => removeCustomStamp(idx)">
            <DeleteOutlined />
          </a-button>
        </div>
        <a-button block class="create-btn" @click="() => isModalOpen = true">Create New Stamp</a-button>
        <input ref="fileRef" style="display: none" type="file" :accept="defaultOptions.stamp.ACCEPT" @change="onInputFileChange" />
        <a-button type="link" size="small" @click="() => fileRef?.click()">
          <template #icon><UploadOutlined /></template>
          {{ t('normal.upload') }}
        </a-button>
      </div>
    </div>
    <a-modal v-model:open="isModalOpen" :title="t('toolbar.buttons.createStamp')" :ok-text="t('normal.ok')" :cancel-text="t('normal.cancel')" class="StampTool" @ok="handleOk" @cancel="() => isModalOpen = false" @after-open-change="onModalOpenChange">
      <div>
        <div class="StampTool-Container">
          <div class="StampTool-Container-ImagePreview" ref="containerRef" :style="{ height: STAMP_HEIGHT + 'px' }" />
          <a-form ref="formRef" :model="formValues" layout="vertical" size="middle" @values-change="onValuesChange">
            <a-form-item :label="t('editor.stamp.stampText')" name="stampText">
              <a-input v-model:value="formValues.stampText" />
            </a-form-item>
            <a-row>
              <a-col :span="5">
                <a-form-item :label="t('editor.stamp.textColor')" name="textColor">
                  <a-popover trigger="click" placement="bottom" :arrow="false">
                    <template #content>
                      <div class="color-picker-panel">
                        <div class="color-presets">
                          <div v-for="color in ['#ffffff', '#000000', ...defaultOptions.colors]" :key="color" class="color-preset" :style="{ backgroundColor: color }" :class="{ active: formValues.textColor === color }" @click="formValues.textColor = color" />
                        </div>
                        <div class="custom-color">
                          <input type="color" :value="formValues.textColor" @input="(e) => formValues.textColor = (e.target as HTMLInputElement).value" />
                          <span>{{ t('normal.customColor') }}</span>
                        </div>
                      </div>
                    </template>
                    <a-button size="small" :style="{ backgroundColor: formValues.textColor, minWidth: '60px' }">{{ t('editor.stamp.textColor') }}</a-button>
                  </a-popover>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item :label="t('editor.stamp.fontStyle')" name="fontStyle">
                  <a-checkbox-group v-model:value="formValues.fontStyle">
                    <a-checkbox value="bold"><BoldOutlined /></a-checkbox>
                    <a-checkbox value="italic"><ItalicOutlined /></a-checkbox>
                    <a-checkbox value="underline"><UnderlineOutlined /></a-checkbox>
                    <a-checkbox value="strikeout"><StrikethroughOutlined /></a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
              <a-col :span="7">
                <a-form-item :label="t('editor.stamp.fontFamily')" name="fontFamily">
                  <a-select v-model:value="formValues.fontFamily" :options="defaultOptions.defaultFontList" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row>
              <a-col :span="8">
                <a-form-item :label="t('editor.stamp.backgroundColor')" name="backgroundColor">
                  <a-popover trigger="click" placement="bottom" :arrow="false">
                    <template #content>
                      <div class="color-picker-panel">
                        <div class="color-presets">
                          <div v-for="color in defaultOptions.colors" :key="color" class="color-preset" :style="{ backgroundColor: color }" :class="{ active: formValues.backgroundColor === color }" @click="formValues.backgroundColor = color" />
                        </div>
                        <div class="custom-color">
                          <input type="color" :value="formValues.backgroundColor" @input="(e) => formValues.backgroundColor = (e.target as HTMLInputElement).value" />
                          <span>{{ t('normal.customColor') }}</span>
                        </div>
                      </div>
                    </template>
                    <a-button size="small" :style="{ backgroundColor: formValues.backgroundColor, minWidth: '80px' }">{{ t('editor.stamp.backgroundColor') }}</a-button>
                  </a-popover>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item :label="t('editor.stamp.borderColor')" name="borderColor">
                  <a-popover trigger="click" placement="bottom" :arrow="false">
                    <template #content>
                      <div class="color-picker-panel">
                        <div class="color-presets">
                          <div v-for="color in defaultOptions.colors" :key="color" class="color-preset" :style="{ backgroundColor: color }" :class="{ active: formValues.borderColor === color }" @click="formValues.borderColor = color" />
                        </div>
                        <div class="custom-color">
                          <input type="color" :value="formValues.borderColor" @input="(e) => formValues.borderColor = (e.target as HTMLInputElement).value" />
                          <span>{{ t('normal.customColor') }}</span>
                        </div>
                      </div>
                    </template>
                    <a-button size="small" :style="{ borderColor: formValues.borderColor, minWidth: '80px' }">{{ t('editor.stamp.borderColor') }}</a-button>
                  </a-popover>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item :label="t('editor.stamp.borderStyle')" name="borderStyle">
                  <a-radio-group v-model:value="formValues.borderStyle">
                    <a-radio value="solid">{{ t('editor.stamp.solid') }}</a-radio>
                    <a-radio value="dashed">{{ t('editor.stamp.dashed') }}</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
            </a-row>
            <a-divider />
            <a-row>
              <a-col :span="10">
                <a-form-item :label="t('editor.stamp.timestampText')" name="timestamp">
                  <a-checkbox-group v-model:value="formValues.timestamp">
                    <a-checkbox value="username">{{ t('editor.stamp.username') }}</a-checkbox>
                    <a-checkbox value="date">{{ t('editor.stamp.date') }}</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
              <a-col :span="14">
                <a-form-item :label="t('editor.stamp.dateFormat')" name="dateFormat">
                  <a-select v-model:value="formValues.dateFormat" :options="DATE_FORMAT_OPTIONS" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item :label="t('editor.stamp.customTimestamp')" name="customTimestampText">
              <a-input v-model:value="formValues.customTimestampText" />
            </a-form-item>
          </a-form>
        </div>
        <div class="StampTool-Toolbar"></div>
      </div>
    </a-modal>
  </div>
  <div v-else>
    <a-popover v-model:open="isPopoverOpen" trigger="click" placement="bottom" :arrow="false" rootClassName="StampPop">
      <template #content>
        <div>
          <a-radio-group v-model:value="stampType" button-style="solid" size="small">
            <a-radio-button value="default">{{ t('normal.default') }}</a-radio-button>
            <a-radio-button value="custom">{{ t('normal.custom') }}</a-radio-button>
          </a-radio-group>
          <ul v-if="stampType === 'default'" class="StampPop-Container">
            <li v-for="(stamp, idx) in defaultStamps" :key="idx"><img @click="handleAdd(stamp.url)" :src="stamp.url" /></li>
          </ul>
          <div v-if="stampType === 'custom'">
            <ul class="StampPop-Container">
              <li v-for="(stamp, idx) in customStamps" :key="idx"><img @click="handleAdd(stamp)" :src="stamp" /></li>
            </ul>
            <a-button type="default" :style="{ marginTop: '8px' }" block size="small" @click="() => { isPopoverOpen = false; isModalOpen = true; }">
              <template #icon><PlusCircleOutlined /></template>
              {{ t('toolbar.buttons.createStamp') }}
            </a-button>
          </div>
          <a-divider />
          <input ref="fileRef" style="display: none" type="file" :accept="defaultOptions.stamp.ACCEPT" @change="onInputFileChange" />
          <div class="StampPop-Toolbar">
            <a-button block type="link" @click="() => fileRef?.click()">
              <template #icon><UploadOutlined /></template>
              {{ t('normal.upload') }}
            </a-button>
          </div>
        </div>
      </template>
      <div class="icon"><component :is="annotation.icon" /></div>
    </a-popover>
    <a-modal v-model:open="isModalOpen" :title="t('toolbar.buttons.createStamp')" :ok-text="t('normal.ok')" :cancel-text="t('normal.cancel')" class="StampTool" @ok="handleOk" @cancel="() => isModalOpen = false" @after-open-change="onModalOpenChange">
      <div>
        <div class="StampTool-Container">
          <div class="StampTool-Container-ImagePreview" ref="containerRef" :style="{ height: STAMP_HEIGHT + 'px' }" />
          <a-form ref="formRef" :model="formValues" layout="vertical" size="middle" @values-change="onValuesChange">
            <a-form-item :label="t('editor.stamp.stampText')" name="stampText"><a-input v-model:value="formValues.stampText" /></a-form-item>
            <!-- rest unchanged -->
          </a-form>
        </div>
        <div class="StampTool-Toolbar"></div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Button as AButton, Checkbox as ACheckbox, Col as ACol,  Divider as ADivider, Form as AForm, FormItem as AFormItem, Input as AInput, Modal as AModal, Popover as APopover, Radio as ARadio, RadioGroup as ARadioGroup, RadioButton as ARadioButton, Row as ARow, Select as ASelect, CheckboxGroup as ACheckboxGroup } from 'ant-design-vue'
import Konva from 'konva'
import { ref, reactive, onUnmounted, watch } from 'vue'
import { PlusCircleOutlined, UploadOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined } from '@ant-design/icons-vue'
import type { IAnnotationType } from '../../const/definitions'
import { useI18n } from 'vue-i18n'
import { defaultOptions } from '../../const/default_options'
import { formatFileSize } from '../../utils/utils'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)

interface Props {
  annotation: IAnnotationType
  userName: string
  inline?: boolean
}
const { annotation, userName, inline = false } = defineProps<Props>()

interface Emits {
  (e: 'add', signatureDataUrl: string): void
}

type FieldType = {
  stampText: string
  fontStyle: string[]
  fontFamily: string
  textColor: string
  backgroundColor: string
  borderColor: string
  borderStyle: 'solid' | 'dashed'
  timestamp: string[]
  customTimestampText: string
  dateFormat: string
}

// duplicate removed
const emit = defineEmits<Emits>()

const { t } = useI18n()

const SHAPE_NAME = 'StampGroup'
const STAMP_WIDTH = 470
const STAMP_HEIGHT = 120

const DATE_FORMAT_OPTIONS = [
  {
    label: '📅',
    options: [
      { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
      { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
      { label: 'YYYY年MM月DD日', value: 'YYYY年MM月DD日' },
      { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
      { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
      { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
      { label: 'dddd, MMMM D, YYYY', value: 'dddd, MMMM D, YYYY' },
      { label: 'MMM D, YYYY', value: 'MMM D, YYYY' },
      { label: 'D MMMM YYYY', value: 'D MMMM YYYY' }
    ]
  },
  {
    label: '⏰',
    options: [
      { label: 'HH:mm:ss', value: 'HH:mm:ss' },
      { label: 'HH:mm', value: 'HH:mm' },
      { label: 'hh:mm A', value: 'hh:mm A' },
      { label: 'h:mm A', value: 'h:mm A' },
      { label: 'HH:mm:ss.SSS', value: 'HH:mm:ss.SSS' }
    ]
  },
  {
    label: '🗓️ ',
    options: [
      { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
      { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' },
      { label: 'DD/MM/YYYY HH:mm', value: 'DD/MM/YYYY HH:mm' },
      { label: 'MM/DD/YYYY hh:mm A', value: 'MM/DD/YYYY hh:mm A' },
      { label: 'YYYY年MM月DD日 HH:mm', value: 'YYYY年MM月DD日 HH:mm' },
      { label: 'dddd, MMMM D, YYYY HH:mm', value: 'dddd, MMMM D, YYYY HH:mm' },
      { label: 'D MMMM YYYY HH:mm', value: 'D MMMM YYYY HH:mm' }
    ]
  }
]

const containerRef = ref<HTMLDivElement>()
const konvaStageRef = ref<Konva.Stage | null>(null)
const fileRef = ref<HTMLInputElement>()
const formRef = ref()

const customStamps = ref<string[]>([])
const maxSize = defaultOptions.stamp.MAX_SIZE
const defaultStamps = defaultOptions.stamp.DEFAULT_STAMP || []

const isPopoverOpen = ref(false)
const isModalOpen = ref(false)
const stampType = ref<string>('default')
// removed panel toggle and header label in inline mode

const DEFAULT_VALUE: FieldType = {
  stampText: t('editor.stamp.defaultText'),
  fontStyle: [],
  fontFamily: defaultOptions.defaultFontList[0].value,
  textColor: defaultOptions.stamp.editor.DEFAULT_TEXT_COLOR,
  backgroundColor: defaultOptions.stamp.editor.DEFAULT_BACKGROUND_COLOR,
  borderColor: defaultOptions.stamp.editor.DEFAULT_BORDER_COLOR || '#000000',
  borderStyle: 'solid',
  timestamp: ['username', 'date'],
  customTimestampText: '',
  dateFormat: 'YYYY-MM-DD'
}

const lastFormValues = ref<FieldType>({ ...DEFAULT_VALUE })
const formValues = reactive<FieldType>({ ...DEFAULT_VALUE })

const handleAdd = (dataUrl: string) => {
  emit('add', dataUrl)
  isPopoverOpen.value = false
}

const handleOk = () => {
  const layer = konvaStageRef.value?.getLayers()[0]
  if (!layer) return

  const shape = layer.getChildren(node => node.name() === SHAPE_NAME)[0]
  if (!shape) return

  const dataUrl = konvaStageRef.value?.toDataURL({
    x: shape.x(),
    y: shape.y(),
    width: shape.width(),
    height: shape.height()
  })

  if (dataUrl) {
    customStamps.value.push(dataUrl)
    try { localStorage.setItem('toolbar.createdStamps', JSON.stringify(customStamps.value)) } catch {}
    handleAdd(dataUrl)
    isModalOpen.value = false
  }
}

const onInputFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (!files?.length) return
  const _file = files[0]

  if (_file.size > maxSize) {
    alert(t('normal.fileSizeLimit', { value: formatFileSize(maxSize) }))
    return
  }

  const reader = new FileReader()

  reader.onload = async (e) => {
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

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const pngDataUrl = canvas.toDataURL('image/png')
        target.value = ''
        customStamps.value.push(pngDataUrl)
        try { localStorage.setItem('toolbar.createdStamps', JSON.stringify(customStamps.value)) } catch {}
        emit('add', pngDataUrl)
        isPopoverOpen.value = false
      }
    }
  }

  reader.readAsDataURL(_file)
}

const removeCustomStamp = (idx: number) => {
  customStamps.value.splice(idx, 1)
  try { localStorage.setItem('toolbar.createdStamps', JSON.stringify(customStamps.value)) } catch {}
}

const initializeKonvaStage = (values: FieldType) => {
  if (!containerRef.value) return

  const { stampText, fontStyle, textColor, backgroundColor, borderColor, borderStyle, timestamp, dateFormat, fontFamily } = values

  konvaStageRef.value?.destroy()

  const stage = new Konva.Stage({
    container: containerRef.value,
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT
  })

  const layer = new Konva.Layer()

  const fontStyleParts: string[] = []
  if (fontStyle.includes('italic')) fontStyleParts.push('italic')
  if (fontStyle.includes('bold')) fontStyleParts.push('bold')
  const fontStyleValue = fontStyleParts.join(' ') || 'normal'
  const isUnderline = fontStyle.includes('underline')
  const isStrikeout = fontStyle.includes('strikeout')
  const now = dayjs()
  const username = userName
  const formattedDate = dateFormat ? now.format(dateFormat) : ''
  const customText = values.customTimestampText?.trim()
  const timestampParts = [
    timestamp.includes('username') ? username : null,
    timestamp.includes('date') ? formattedDate : null,
    customText || null
  ].filter(Boolean)
  const timestampText = timestampParts.join(' · ')
  let textFontSize = 30
  const timeFontSize = 16
  const spacing = 10

  const tempTextNode = new Konva.Text({
    text: stampText,
    fontSize: textFontSize,
    fontStyle: fontStyleValue,
    fontFamily: fontFamily
  })

  const tempTimestampNode = new Konva.Text({
    text: timestampText,
    fontSize: timeFontSize,
    fontFamily: fontFamily
  })

  const contentWidth = Math.max(tempTextNode.width(), tempTimestampNode.width()) + 60
  const contentHeight = textFontSize + spacing + timeFontSize + 25

  const shapeWidth = Math.max(contentWidth, 180)
  const shapeHeight = Math.max(contentHeight, 60)

  const shape = new Konva.Rect({
    name: SHAPE_NAME,
    width: shapeWidth,
    height: shapeHeight,
    x: (STAMP_WIDTH - shapeWidth) / 2,
    y: (STAMP_HEIGHT - shapeHeight) / 2,
    fill: backgroundColor,
    strokeWidth: 3,
    stroke: borderColor,
    dash: borderStyle === 'dashed' ? [5, 5] : undefined,
    cornerRadius: 8
  })
  layer.add(shape)

  if (!timestampText) {
    textFontSize = textFontSize * 1.2
  }

  let textY: number

  if (timestampText) {
    textY = (STAMP_HEIGHT - shapeHeight) / 2 + 15
  } else {
    textY = (STAMP_HEIGHT - shapeHeight) / 2 + shapeHeight / 2 - textFontSize / 2
  }

  const stampTextNode = new Konva.Text({
    text: stampText,
    x: 0,
    y: textY,
    width: STAMP_WIDTH,
    align: 'center',
    fontSize: textFontSize,
    fontStyle: fontStyleValue,
    fontFamily: fontFamily,
    fill: textColor
  })

  layer.add(stampTextNode)

  if (isUnderline) {
    const underlineY = stampTextNode.y() + textFontSize + 4
    const underline = new Konva.Line({
      points: [shape.x(), underlineY, shape.x() + shape.width(), underlineY],
      stroke: textColor,
      strokeWidth: 2
    })
    layer.add(underline)
  }

  if (isStrikeout) {
    const strikeoutLineY = stampTextNode.y() + textFontSize / 2
    const strikeoutLine = new Konva.Line({
      points: [shape.x(), strikeoutLineY, shape.x() + shape.width(), strikeoutLineY],
      stroke: textColor,
      strokeWidth: 2
    })
    layer.add(strikeoutLine)
  }

  const timestampNode = new Konva.Text({
    text: timestampText,
    x: 0,
    y: textY + textFontSize + spacing,
    width: STAMP_WIDTH,
    align: 'center',
    fontSize: timeFontSize,
    fontFamily: fontFamily,
    fill: textColor
  })
  
  if (timestampText) {
    layer.add(timestampNode)
  }
  
  stage.add(layer)
  konvaStageRef.value = stage
}

const destroyKonvaStage = () => {
  const stage = konvaStageRef.value
  if (stage) {
    stage.destroy()
    konvaStageRef.value = null
  }
}

const onValuesChange = () => {
  const rawTextColor = formValues.textColor
  const rawBackgroundColor = formValues.backgroundColor
  const rawBorderColor = formValues.borderColor

  // 现在颜色值直接是字符串，不需要特殊处理
  lastFormValues.value = {
    ...formValues,
    textColor: rawTextColor,
    backgroundColor: rawBackgroundColor,
    borderColor: rawBorderColor
  }

  initializeKonvaStage({
    ...formValues,
    textColor: rawTextColor,
    backgroundColor: rawBackgroundColor,
    borderColor: rawBorderColor
  })
}

const onModalOpenChange = (open: boolean) => {
  if (open) {
    const initialValues = lastFormValues.value || DEFAULT_VALUE
    Object.assign(formValues, initialValues)
    initializeKonvaStage(initialValues)
  } else {
    destroyKonvaStage()
  }
}

watch(() => formValues, onValuesChange, { deep: true })

onUnmounted(() => {
  destroyKonvaStage()
})

watch(isModalOpen, (val) => {
  if (val) {
    try {
      const saved = JSON.parse(localStorage.getItem('toolbar.createdStamps') || '[]')
      if (Array.isArray(saved)) customStamps.value = saved
    } catch {}
  }
})
</script>
<style scoped>
.StampInline { width: 300px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.StampInline .header { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; }
.StampInline .pill { background:#eef5e8; color:#4b7f2f; border:1px solid #cdd9bf; border-radius:8px; padding:4px 10px; font-weight:600; }
.StampInline .panel { border-top:1px solid #eaeaea; padding:8px; }
.StampInline .tabs { width:100%; margin-bottom:8px; }
.StampInline .grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:180px; overflow:auto; }
.StampInline .chip { border:2px solid #3b5998; border-radius:12px; padding:6px 10px; text-align:center; font-weight:700; background:#f7f9fc; cursor:pointer; }
.StampInline .chip img { height:28px; }
.StampInline .create-btn { margin-top:8px; }
</style>

<style scoped>
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

.icon {
    font-size: 18px;
    padding: 5px 10px 3px 10px;
    border-bottom: 1px solid transparent;
    opacity: 0.9;
    display: flex;
    align-items: center;
    justify-content: center;
    
    svg {
        width: 1em;
        height: 1em;
        fill: currentColor;
    }
}
</style>
