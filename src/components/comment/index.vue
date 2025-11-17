<script setup lang="ts">
import { ref, computed, watch, defineExpose, nextTick, defineComponent, h } from 'vue'
import { Button, Checkbox, Dropdown, Popover, Space, Typography } from 'ant-design-vue'
import { MoreOutlined, FilterOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import type { IAnnotationComment, IAnnotationStore, PdfjsAnnotationSubtype } from '../../const/definitions'
// simplified comment: status removed
import { formatPDFDate, formatTimestamp } from '../../utils/utils'
import {
  CircleIcon,
  FreehandIcon,
  FreeHighlightIcon,
  FreetextIcon,
  HighlightIcon,
  RectangleIcon,
  StampIcon,
  StrikeoutIcon,
  UnderlineIcon,
  SignatureIcon,
  NoteIcon,
  ExportIcon,
  ArrowIcon,
  CloudIcon
} from '../../const/icon'


const { Text, Paragraph } = Typography

interface CustomCommentProps {
  userName: string
  onSelected: (annotation: IAnnotationStore) => void
  onUpdate: (annotation: IAnnotationStore) => void
  onDelete: (id: string) => void
  onScroll?: () => void
}

const props = defineProps<CustomCommentProps>()

// -------------------- 状态 --------------------
const annotations = ref<IAnnotationStore[]>([])
const currentAnnotation = ref<IAnnotationStore | null>(null)
// removed comment/reply input states
const selectedUsers = ref<string[]>([])
const selectedTypes = ref<PdfjsAnnotationSubtype[]>([])

const annotationRefs = ref<Record<string, HTMLDivElement>>({})

// -------------------- i18n --------------------
const { t } = useI18n({ useScope: 'global' })

// -------------------- 图标映射 --------------------
const iconMapping: Record<PdfjsAnnotationSubtype, any> = {
  Circle: CircleIcon,
  FreeText: FreetextIcon,
  Ink: FreehandIcon,
  Highlight: HighlightIcon,
  Underline: UnderlineIcon,
  Squiggly: FreeHighlightIcon,
  StrikeOut: StrikeoutIcon,
  Stamp: StampIcon,
  Line: FreehandIcon,
  Square: RectangleIcon,
  Polygon: FreehandIcon,
  PolyLine: CloudIcon,
  Caret: SignatureIcon,
  Link: FreehandIcon,
  Text: NoteIcon,
  FileAttachment: ExportIcon,
  Popup: FreehandIcon,
  Widget: FreehandIcon,
  Note: NoteIcon,
  Arrow: ArrowIcon
}

// status dropdown removed

// -------------------- 工具函数 --------------------
const AnnotationIcon = defineComponent({
  name: 'AnnotationIcon',
  props: {
    subtype: {
      type: String as () => PdfjsAnnotationSubtype,
      required: true
    }
  },
  setup(props) {
    return () => {
      const Icon = iconMapping[props.subtype]
      return Icon ? h('span', { class: 'annotation-icon' }, [h(Icon)]) : null
    }
  }
})

// status icon removed

// -------------------- 方法 --------------------
const addAnnotation = (annotation: IAnnotationStore) => {
  annotations.value.push(annotation)
  currentAnnotation.value = null
}

const delAnnotation = (id: string) => {
  annotations.value = annotations.value.filter(a => a.id !== id)
  if (currentAnnotation.value?.id === id) currentAnnotation.value = null
  // reply/edit states removed
}

const updateAnnotation = (updatedAnnotation: IAnnotationStore) => {
  annotations.value = annotations.value.map(a => {
    if (a.id === updatedAnnotation.id) {
      return { ...a, konvaClientRect: updatedAnnotation.konvaClientRect, color: updatedAnnotation.color ?? a.color, opacity: updatedAnnotation.opacity ?? a.opacity, strokeWidth: updatedAnnotation.strokeWidth ?? a.strokeWidth, date: formatTimestamp(Date.now()) }
    }
    return a
  })
  // edit state removed
}

const copyAnnotation = async (annotation: IAnnotationStore) => {
  const text = annotation.contentsObj?.text || ''
  try { await navigator.clipboard.writeText(text) } catch {}
}

const getCardStyle = (annotation: IAnnotationStore) => {
  const hex = annotation.color || '#1677ff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { borderLeft: `4px solid ${hex}`, background: `rgba(${r}, ${g}, ${b}, 0.08)` }
}

const selectedAnnotation = (annotation: IAnnotationStore, isClick: boolean) => {
  currentAnnotation.value = annotation
  if (!isClick) return
  nextTick(() => {
    const el = annotationRefs.value[annotation.id]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

// -------------------- 用户/类型过滤 --------------------
const allUsers = computed(() => {
  const map = new Map<string, number>()
  annotations.value.forEach(a => map.set(a.title, (map.get(a.title) || 0) + 1))
  return Array.from(map.entries())
})

const allTypes = computed(() => {
  const map = new Map<PdfjsAnnotationSubtype, number>()
  annotations.value.forEach(a => map.set(a.subtype, (map.get(a.subtype) || 0) + 1))
  return Array.from(map.entries())
})

watch(allUsers, (v) => selectedUsers.value = v.map(([u]) => u), { immediate: true })
watch(allTypes, (v) => selectedTypes.value = v.map(([t]) => t), { immediate: true })

const filteredAnnotations = computed(() => {
  if (!selectedUsers.value.length || !selectedTypes.value.length) return []
  return annotations.value.filter(a => selectedUsers.value.includes(a.title) && selectedTypes.value.includes(a.subtype))
})

const groupedAnnotations = computed(() => {
  return filteredAnnotations.value.reduce((acc: Record<number, IAnnotationStore[]>, annotation) => {
    if (!acc[annotation.pageNumber]) acc[annotation.pageNumber] = []
    acc[annotation.pageNumber].push(annotation)
    return acc
  }, {})
})

// -------------------- 切换 --------------------
// author filter removed
const handleTypeToggle = (type: PdfjsAnnotationSubtype) => {
  selectedTypes.value = selectedTypes.value.includes(type) ? selectedTypes.value.filter(t => t !== type) : [...selectedTypes.value, type]
}

// -------------------- 评论/回复 --------------------
// removed comment/reply input flows

const deleteReply = (annotation: IAnnotationStore, reply: IAnnotationComment) => {
  let updatedAnnotation: IAnnotationStore | null = null
  annotations.value = annotations.value.map(a => {
    if (a.id === annotation.id) {
      updatedAnnotation = { ...a, comments: a.comments?.filter(c => c.id !== reply.id) }
      return updatedAnnotation
    }
    return a
  })
  if (updatedAnnotation) props.onUpdate(updatedAnnotation)
}

const deleteAnnotation = (annotation: IAnnotationStore) => {
  annotations.value = annotations.value.filter(a => a.id !== annotation.id)
  if (currentAnnotation.value?.id === annotation.id) currentAnnotation.value = null
  props.onDelete(annotation.id)
}

// -------------------- 暴露给父组件 --------------------
defineExpose({
  addAnnotation,
  delAnnotation,
  updateAnnotation,
  selectedAnnotation
})
</script>

<template>
  <div class="CustomComment" @scroll="props.onScroll && props.onScroll()">
    <div class="filters">
      <div class="FiltersHeader">
        <span class="FiltersTitle">笺注</span>
        <Popover placement="bottomLeft" trigger="click">
          <template #content>
            <div class="CustomComment_filterContent">
              <!-- <div class="title">{{ t('normal.type') }}</div> -->
              <div class="filterRows">
                <div class="filterRow" v-for="([type, count]) in allTypes" :key="type">
                  <Checkbox :checked="selectedTypes.includes(type)" @change="() => handleTypeToggle(type)">
                    <Space>
                      <AnnotationIcon :subtype="type" />
                      <Text type="secondary">({{ count }})</Text>
                    </Space>
                  </Checkbox>
                </div>
              </div>
              <div class="filterActions">
                <Button class="filterActionBtn" type="link" size="small" @click="selectedTypes = allTypes.map(([t]) => t)">{{ t('normal.selectAll') }}</Button>
                <Button class="filterActionBtn" type="link" size="small" @click="selectedTypes = []">{{ t('normal.clear') }}</Button>
              </div>
            </div>
          </template>
          <Button class="FiltersIconBtn" type="text" size="small">
            <template #icon>
              <FilterOutlined />
            </template>
          </Button>
        </Popover>
      </div>
    </div>

    <div class="list">
      <div v-for="(annotationsForPage, pageNumber) in groupedAnnotations" :key="pageNumber" class="group">
        <h3>
          {{ t('comment.page', { value: pageNumber }) }}
          <span>{{ t('comment.total', { value: annotationsForPage.length }) }}</span>
        </h3>

        <div
          v-for="annotation in annotationsForPage.sort((a,b)=>a.konvaClientRect.y - b.konvaClientRect.y)"
          :key="annotation.id"
          :ref="el => { if(el) annotationRefs[annotation.id] = el as HTMLDivElement }"
          :class="['comment', { selected: annotation.id === currentAnnotation?.id }]"
          :style="getCardStyle(annotation)"
          @click="() => selectedAnnotation(annotation, true)"
        >
          <!-- Title + Tool -->
          <div class="title">
            <AnnotationIcon :subtype="annotation.subtype" />
            <div class="username"><span>{{ formatPDFDate(annotation.date, true) }}</span></div>
            <span class="tool">
              <Button size="small" type="text" @click.stop="copyAnnotation(annotation)"><CopyOutlined /></Button>
              <Button size="small" type="text" danger @click.stop="deleteAnnotation(annotation)"><DeleteOutlined /></Button>
            </span>
          </div>

          <Paragraph style="margin:8px 0 8px 15px" :ellipsis="{ rows:3, expandable:true, symbol: t('normal.more') }">
            {{ annotation.contentsObj?.text || '' }}
          </Paragraph>

          <!-- 回复列表 -->
          <div v-for="reply in annotation.comments" :key="reply.id" class="reply">
            <div class="title">
              <div class="username">{{ reply.title }}<span>{{ formatPDFDate(reply.date, true) }}</span></div>
              <span class="tool">
                <Dropdown>
                  <template #overlay>
                    <ul>
                      <li @click.stop="deleteReply(annotation, reply)">{{ t('normal.delete') }}</li>
                    </ul>
                  </template>
                  <span class="icon"><MoreOutlined /></span>
                </Dropdown>
              </span>
            </div>
            <p>{{ reply.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 可复用原 index.scss 样式 */
@use './index.scss' as *;

.FiltersHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  margin-bottom: 4px;
}
.FiltersTitle {
  font-weight: 600;
  color: #1d1d1f;
}
.FiltersIconBtn {
  color: #666;
}

.CustomComment_filterContent {
  padding: 0px;
}
.filterRows {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filterRow {
  margin: 0;
  padding: 0;
}
.filterActions {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.filterActionBtn {
  padding: 0;
  color: #007aff;
}
</style>
