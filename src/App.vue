<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'

interface Props {
  url?: string // pdf文件地址，可选
  username?: string // 用户名，可选
  userId?: string // 用户ID，可选
  appId?: string // 应用ID，可选
  fileId?: string // 文件ID，可选
  getUrl?: string // 数据获取地址，可选
  postUrl?: string // 数据保存地址，可选
}

const props = withDefaults(defineProps<Props>(), {
  url: "https://mbtest-1257877758.cos.ap-chengdu.myqcloud.com/library/neurosurg-focus-article-pE6.pdf",
  username: undefined,
  userId: undefined,
  appId: undefined,
  fileId: undefined,
  getUrl: "/api/v1/repository/literature/metadata/annotation",
  postUrl: "/api/v1/repository/literature/metadata/annotation"
})

const dataLoading = ref<boolean>(true)
const loadingError = ref<string>('')
const pdfUrl = ref<string>('') // 完整的 viewer URL
const blobUrl = ref<string>('') // 存储 blob URL 以便清理
const fileUrl = '/pdfjs-5.4.54-dist/web/viewer.html?file=' // pdfjs viewer 基础地址

// 清理之前的 blob URL
const cleanupBlobUrl = () => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = ''
  }
}

/**
 * @description 构建 hash 参数
 * @returns hash 参数字符串
 */
const buildHashParams = (): string => {
  const params = new URLSearchParams()

  if (props.username) params.append('ae_username', props.username)
  if (props.userId) params.append('ae_user_id', props.userId)
  if (props.appId) params.append('ae_app_id', props.appId)
  if (props.fileId) params.append('ae_file_id', props.fileId)
  if (props.getUrl) params.append('ae_get_url', props.getUrl)
  if (props.postUrl) params.append('ae_post_url', props.postUrl)

  const paramsStr = params.toString()
  return paramsStr ? `#${paramsStr}` : ''
}

// 更新 pdfUrl 的方法
const updatePdfUrl = async () => {
  const hashParams = buildHashParams()

  if (!props.url) {
    // 如果没有 URL，只加载 viewer，用户可以通过菜单打开本地文件
    pdfUrl.value = `/pdfjs-5.4.54-dist/web/viewer.html${hashParams}`
    dataLoading.value = false
    return
  }

  try {
    dataLoading.value = true
    loadingError.value = ''

    // 清理之前的 blob URL
    cleanupBlobUrl()

    // 通过 fetch 下载 PDF 文件（避免浏览器直接下载的问题）
    console.log('Fetching PDF from:', props.url)
    const response = await fetch(props.url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 将响应转换为 blob
    const blob = await response.blob()
    console.log('PDF blob size:', blob.size, 'type:', blob.type)

    // 创建 blob URL
    const objectUrl = URL.createObjectURL(blob)
    blobUrl.value = objectUrl

    // 使用 blob URL 构建 viewer URL，并添加 hash 参数
    pdfUrl.value = `${fileUrl}${encodeURIComponent(objectUrl)}${hashParams}`
    console.log('Viewer URL ready:', pdfUrl.value)

    dataLoading.value = false
  } catch (error) {
    console.error('Error loading PDF:', error)
    loadingError.value = error instanceof Error ? error.message : 'Failed to load PDF'
    dataLoading.value = false
  }
}

// 初始化 pdfUrl
onMounted(() => {
  updatePdfUrl()
})

// 监听所有相关 props 的变化
watch(
  () => [props.url, props.username, props.userId, props.appId, props.fileId, props.getUrl, props.postUrl],
  () => {
    updatePdfUrl()
  }
)

// 组件卸载时清理 blob URL
onUnmounted(() => {
  cleanupBlobUrl()
})
</script>

<template>
  <div v-if="dataLoading" class="loading-component">
    <div class="spinner"></div>
    <div class="loading-text">Loading PDF...</div>
  </div>
  <div v-else-if="loadingError" class="error-component">
    <div class="error-icon">⚠️</div>
    <div class="error-text">{{ loadingError }}</div>
    <div class="error-hint">Please check the URL and try again.</div>
  </div>
  <div class="container">
    <iframe
      v-show="!dataLoading && !loadingError"
      :src="pdfUrl"
      width="100%"
      height="100%"
      frameborder="0"
    ></iframe>
  </div>
  <div>asdasdasd</div>
</template>

<style scoped>
.container {
  width: 800px;
  height: 800px;
}

.loading-component {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  height: 800px;
  background-color: #f8f9fa;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #6c757d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-component {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  height: 800px;
  background-color: #fff5f5;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 16px;
  color: #dc3545;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 600;
  margin-bottom: 8px;
}

.error-hint {
  font-size: 14px;
  color: #6c757d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
