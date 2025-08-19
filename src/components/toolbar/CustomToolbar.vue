<template>
  <div class="CustomToolbar">
    <!-- 左侧注释工具按钮 -->
    <ul class="buttons">
      <template v-for="(annotation, index) in annotations" :key="index">
        <li
          v-if="annotation.type === Annotation.STAMP"
          :title="t(`annotations.${annotation.name}`)"
          :class="{ selected: annotation.type === currentAnnotation?.type }"
        >
          <!-- <StampTool
            :userName="userName"
            :annotation="annotation"
            @add="signatureDataUrl => handleAdd(signatureDataUrl, annotation)"
          /> -->
        </li>

        <!-- <li
          v-else-if="annotation.type === AnnotationType.SIGNATURE"
          :title="t(`annotations.${annotation.name}`)"
          :class="{ selected: annotation.type === currentAnnotation?.type }"
        >
          <SignatureTool
            :annotation="annotation"
            @add="signatureDataUrl => handleAdd(signatureDataUrl, annotation)"
          />
        </li> -->

        <li
          v-else
          :title="t(`annotations.${annotation.name}`)"
          :class="{ selected: annotation.type === currentAnnotation?.type }"
          @click="handleAnnotationClick(annotation.type === currentAnnotation?.type ? null : annotation)"
        >
          <div class="icon">{{ annotation.icon }}</div>
          <div class="name">{{ t(`annotations.${annotation.name}`) }}</div>
        </li>
      </template>

      <!-- 颜色选择器 -->
      <template>
        <li 
          :class="{ disabled: !currentAnnotation?.styleEditable?.color }" 
          :title="t('normal.color')"
          @click="showColorPicker = !showColorPicker"
        >
          <div class="icon">
            <PaletteIcon :style="{ color: currentAnnotation?.style?.color }" />
          </div>
          <div class="name">{{ t('normal.color') }}</div>

          <div v-if="showColorPicker" class="color-picker-popover">
            <div 
              v-for="color in defaultOptions.colors" 
              :key="color"
              class="color-option"
              :style="{ backgroundColor: color }"
              @click="handleColorChange(color)"
            ></div>
            <input
              type="color"
              v-model="customColor"
              @change="handleColorChange(customColor)"
            />
          </div>
        </li>
      </template>
    </ul>

    <div class="splitToolbarButtonSeparator"></div>

    <!-- 保存 / 导出 -->
    <ul class="buttons">
      <li
        v-if="defaultOptions.setting.SAVE_BUTTON"
        :title="t('normal.save')"
        @click="onSave"
      >
        <div class="icon"><SaveIcon /></div>
        <div class="name">{{ t('normal.save') }}</div>
      </li>

      <li
        v-if="defaultOptions.setting.EXPORT_PDF || defaultOptions.setting.EXPORT_EXCEL"
        :title="t('normal.export')"
      >
        <Popover trigger="click" placement="bottom">
          <template #content>
            <Space direction="vertical">
              <Button
                v-if="defaultOptions.setting.EXPORT_PDF"
                block
                type="default"
                @click="() => onExport('pdf')"
              >
                <template #icon><FilePdfOutlined /></template>
                PDF
              </Button>

              <Button
                v-if="defaultOptions.setting.EXPORT_EXCEL"
                block
                type="default"
                @click="() => onExport('excel')"
              >
                <template #icon><FilePdfOutlined /></template>
                Excel
              </Button>
            </Space>
          </template>
          <div class="icon"><ExportIcon /></div>
          <div class="name">{{ t('normal.export') }}</div>
        </Popover>
      </li>
    </ul>

    <!-- 右侧 sidebar -->
    <ul class="buttons right">
      <li
        @click="handleSidebarOpen(sidebarOpen)"
        :class="{ selected: sidebarOpen }"
      >
        <div class="icon"><AnnoIcon /></div>
        <div class="name">{{ t('anno') }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineExpose } from "vue";
import { useI18n } from 'vue-i18n'
import {
  annotationDefinitions,
  Annotation,
  type AnnotationType,
  type IAnnotationStyle,
  type IAnnotationType,
  PdfjsAnnotationEditorType,
} from "../../const/definitions";
import { AnnoIcon, ExportIcon, PaletteIcon, SaveIcon } from "../../const/icon";
// import { SignatureTool } from "./signature";
// import { StampTool } from "./stamp";
import { defaultOptions } from "../../const/default_options";
import { FilePdfOutlined } from "@ant-design/icons-vue";
// import { message } from "ant-design-vue";
import { Popover, Button, Space } from 'ant-design-vue'

interface Props {
  defaultAnnotationName?: string; // 可选
  defaultSidebarOpen?: boolean;
  userName?: string;
  onChange?: (annotation: IAnnotationType | null, dataTransfer: string | null) => void;
  onSave?: () => void;
  onExport?: (type: "pdf" | "excel") => void;
  onSidebarOpen?: (open: boolean) => void;
}

const props = withDefaults(defineProps<Props>(), {
  defaultAnnotationName: "",   // 👈 防止 null 报错
  defaultSidebarOpen: false,   // 👈 默认关闭
  userName: "anonymous",       // 👈 给个兜底用户名
  onChange: () => {},
  onSave: () => {},
  onExport: () => {},
  onSidebarOpen: () => {}
});


const { t } = useI18n();

// 初始化 annotation
const defaultAnnotation = computed<IAnnotationType | null>(() => {
  if (!props.defaultAnnotationName) return null;
  return (
    annotationDefinitions.find(
      (item) => item.name === props.defaultAnnotationName
    ) || null
  );
});

const showColorPicker = ref(false)
const customColor = ref('#000000')

const currentAnnotation = ref<IAnnotationType | null>(defaultAnnotation.value);
const annotations = ref<IAnnotationType[]>(
  annotationDefinitions.filter(
    (item) => item.pdfjsEditorType !== PdfjsAnnotationEditorType.HIGHLIGHT
  )
);
const dataTransfer = ref<string | null>(null);
const sidebarOpen = ref<boolean>(props.defaultSidebarOpen);

// --- 暴露给外部的方法 ---
function activeAnnotation(annotation: IAnnotationType) {
  handleAnnotationClick(annotation);
}

function toggleSidebarBtn(open: boolean) {
  sidebarOpen.value = open;
}

function updateStyle(annotationType: AnnotationType, style: IAnnotationStyle) {
  annotations.value = annotations.value.map((annotation) => {
    if ((annotation.type as unknown as AnnotationType) === annotationType) {
      annotation.style = { ...annotation.style, ...style };
    }
    return annotation;
  });
}

defineExpose({ activeAnnotation, toggleSidebarBtn, updateStyle });

// --- 内部逻辑 ---
function handleAnnotationClick(annotation: IAnnotationType | null) {
  currentAnnotation.value = annotation;
  if (annotation?.type !== Annotation.SIGNATURE) {
    dataTransfer.value = null;
  }
}

// function handleAdd(signatureDataUrl: string, annotation: IAnnotationType) {
//   message.info(t("toolbar.message.selectPosition"));
//   dataTransfer.value = signatureDataUrl;
//   currentAnnotation.value = annotation;
// }

function handleColorChange(color: string) {
  if (!currentAnnotation.value) return;
  const updatedAnnotation = {
    ...currentAnnotation.value,
    style: { ...currentAnnotation.value.style, color },
  };
  annotations.value = annotations.value.map((annotation) =>
    annotation.type === currentAnnotation.value?.type
      ? updatedAnnotation
      : annotation
  );
  currentAnnotation.value = updatedAnnotation;
}

function handleSidebarOpen(isOpen: boolean) {
  props.onSidebarOpen(!isOpen);
  sidebarOpen.value = !isOpen;
}

// 监听变化并通知外部
watch([currentAnnotation, dataTransfer], () => {
  props.onChange(currentAnnotation.value, dataTransfer.value);
});
</script>

<style scoped lang="scss">
.CustomToolbar {
  display: flex;
  align-items: center;
  .buttons {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      cursor: pointer;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;

      &.selected {
        background: #e6f4ff;
      }
      &.disabled {
        pointer-events: none;
        opacity: 0.5;
      }
    }
  }
  .splitToolbarButtonSeparator {
    width: 1px;
    height: 24px;
    background: #ccc;
    margin: 0 10px;
  }
  .buttons.right {
    margin-left: auto;
  }
}
</style>
