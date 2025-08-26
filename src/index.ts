import './scss/app.scss'
// import 'ant-design-vue/dist/reset.css'

import type { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { initializeI18n } from './locale/index'
import { SyncOutlined } from '@ant-design/icons-vue'
import { t } from 'i18next'
import { annotationDefinitions, HASH_PARAMS_DEFAULT_EDITOR_ACTIVE, HASH_PARAMS_DEFAULT_SIDEBAR_OPEN, HASH_PARAMS_GET_URL, HASH_PARAMS_POST_URL, HASH_PARAMS_USERNAME, type IAnnotationStore, type IAnnotationStyle, type IAnnotationType } from './const/definitions'
import { Painter } from './painter'
import { once, parseQueryString, hashArrayOfObjects } from './utils/utils'
import { defaultOptions } from './const/default_options'
import { exportAnnotationsToExcel, exportAnnotationsToPdf } from './annot/index'
import { ConnectorLine } from './painter/connectorLine'

// Vue3
import { createApp, ref, h, type Ref } from 'vue'
// 按需引入 Ant Design Vue 组件
import { 
  Button, 
  Modal, 
  Space, 
  message, 
  Popover, 
  Form, 
  Input, 
  Select, 
  Row, 
  Col, 
  Radio, 
  Checkbox, 
  Divider,
  Typography,
  Dropdown,
  Upload,
  Slider
} from 'ant-design-vue'
import i18n from './locale/index'
// Vue components
import CustomPopbar from './components/popbar.vue'
import CustomToolbar from './components/toolbar/CustomToolbar.vue'
import CustomComment from './components/comment/index.vue'
import CustomAnnotationMenu from './components/menu/index.vue'

interface AppOptions {
  [key: string]: string
}

// 创建配置好的 Vue 应用实例的辅助函数 - 体积最小化版本
function createConfiguredApp(component: any, props: any) {
  const app = createApp(component, props)
  
  // 只安装实际使用的组件，避免全量安装
  const components = [Button, Modal, Space, Popover, Form, Input, Select, Row, Col, Radio, Checkbox, Divider, Typography, Dropdown, Upload, Slider]
  components.forEach(comp => app.use(comp))
  
  // 最小化 message 服务配置
  app.config.globalProperties.$message = message
  
  // 安装 i18n（已经是轻量级配置）
  app.use(i18n)
  
  return app
}

class PdfjsAnnotationExtension {
  PDFJS_PDFViewerApplication: PDFViewerApplication
  PDFJS_EventBus: EventBus
  $PDFJS_outerContainer: HTMLDivElement
  $PDFJS_mainContainer: HTMLDivElement
  $PDFJS_sidebarContainer: HTMLDivElement
  $PDFJS_toolbar_container: HTMLDivElement
  $PDFJS_viewerContainer: HTMLDivElement

  customToolbarRef: Ref<any>
  customPopbarRef: Ref<any>
  customerAnnotationMenuRef: Ref<any>
  customCommentRef: Ref<any>
  selectedCategoryRef: Ref<string>

  painter: Painter
  appOptions: AppOptions
  loadEnd: boolean
  initialDataHash: number | null
  _connectorLine: ConnectorLine | null = null

  constructor() {
    this.loadEnd = false
    this.initialDataHash = null

    this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
    this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
    this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
    this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
    this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
    this.$PDFJS_mainContainer = this.PDFJS_PDFViewerApplication.appConfig.mainContainer
    this.$PDFJS_outerContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.outerContainer

    // Vue3 ref
    this.customToolbarRef = ref()
    this.customPopbarRef = ref()
    this.customerAnnotationMenuRef = ref()
    this.customCommentRef = ref()
    this.selectedCategoryRef = ref('')

    // i18n
    initializeI18n(this.PDFJS_PDFViewerApplication.l10n.getLanguage())

    this.appOptions = {
      [HASH_PARAMS_USERNAME]: i18n.global.t('normal.unknownUser'),
      [HASH_PARAMS_GET_URL]: defaultOptions.setting.HASH_PARAMS_GET_URL,
      [HASH_PARAMS_POST_URL]: defaultOptions.setting.HASH_PARAMS_POST_URL,
      [HASH_PARAMS_DEFAULT_EDITOR_ACTIVE]: defaultOptions.setting.HASH_PARAMS_DEFAULT_EDITOR_ACTIVE,
      [HASH_PARAMS_DEFAULT_SIDEBAR_OPEN]: defaultOptions.setting.HASH_PARAMS_DEFAULT_SIDEBAR_OPEN,
    }

    this.parseHashParams()

    this.painter = new Painter({
      userName: this.getOption(HASH_PARAMS_USERNAME),
      PDFViewerApplication: this.PDFJS_PDFViewerApplication,
      PDFJS_EventBus: this.PDFJS_EventBus,
      setDefaultMode: () => {
        this.customToolbarRef.value?.activeAnnotation(annotationDefinitions[0])
      },
      onWebSelectionSelected: range => {
        this.customPopbarRef.value?.open(range)
      },
      onStoreAdd: (annotation, isOriginal, currentAnnotation) => {
        this.customCommentRef.value?.addAnnotation(annotation)
        if (isOriginal) return
        if (currentAnnotation.isOnce) {
          this.painter.selectAnnotation(annotation.id)
        }
        if (this.isCommentOpen()) {
          this.customCommentRef.value?.selectedAnnotation(annotation, true)
        }
      },
      onStoreDelete: id => {
        this.customCommentRef.value?.delAnnotation(id)
      },
      onAnnotationSelected: (annotation, isClick, selectorRect) => {
        this.customerAnnotationMenuRef.value?.open(annotation, selectorRect)
        if (isClick && this.isCommentOpen()) {
          this.customCommentRef.value?.selectedAnnotation(annotation, isClick)
        }
        this.connectorLine?.drawConnection(annotation, selectorRect)
      },
      onAnnotationChange: annotation => {
        this.customCommentRef.value?.updateAnnotation(annotation)
      },
      onAnnotationChanging: () => {
        this.connectorLine?.clearConnection()
        this.customerAnnotationMenuRef.value?.close()
      },
      onAnnotationChanged: (annotation, selectorRect) => {
        this.connectorLine?.drawConnection(annotation, selectorRect)
        this.customerAnnotationMenuRef.value?.open(annotation, selectorRect)
      },
    })

    this.init()
  }

  get connectorLine(): ConnectorLine | null {
    if (defaultOptions.connectorLine.ENABLED) {
      this._connectorLine = new ConnectorLine({})
    }
    return this._connectorLine
  }

  private init() {
    this.addCustomStyle()
    this.bindPdfjsEvents()
    this.setupPrimaryMenuButtons()
    this.renderToolbar()
    this.renderPopBar()
    this.renderAnnotationMenu()
    this.renderComment()
  }

  private parseHashParams() {
    const hash = document.location.hash.substring(1)
    if (!hash) return
    const params = parseQueryString(hash)
    if (params.has(HASH_PARAMS_USERNAME)) {
      const username = params.get(HASH_PARAMS_USERNAME)
      if (username) {
        this.setOption(HASH_PARAMS_USERNAME, username)
      }
    }
    if (params.has(HASH_PARAMS_GET_URL)) {
      const getUrl = params.get(HASH_PARAMS_GET_URL)
      if (getUrl) {
        this.setOption(HASH_PARAMS_GET_URL, getUrl)
      }
    }
    if (params.has(HASH_PARAMS_POST_URL)) {
      const postUrl = params.get(HASH_PARAMS_POST_URL)
      if (postUrl) {
        this.setOption(HASH_PARAMS_POST_URL, postUrl)
      }
    }
  }

  private setOption(name: string, value: string) {
    this.appOptions[name] = value
  }

  private getOption(name: string) {
    return this.appOptions[name]
  }

  private addCustomStyle() {
    document.body.classList.add('PdfjsAnnotationExtension')
    this.toggleComment(this.getOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) === 'true')
  }

  private toggleComment(open: boolean) {
    if (open) {
      document.body.classList.remove('PdfjsAnnotationExtension_Comment_hidden')
    } else {
      document.body.classList.add('PdfjsAnnotationExtension_Comment_hidden')
    }
  }

  private isCommentOpen(): boolean {
    return !document.body.classList.contains('PdfjsAnnotationExtension_Comment_hidden')
  }

  private setupPrimaryMenuButtons(): void {
    // 等待DOM加载后设置事件监听器
    setTimeout(() => {
      // 默认选中View按钮，隐藏二级菜单
      this.selectedCategoryRef.value = 'view'
      this.hideSecondaryToolbar()
      
      // 设置一级菜单按钮事件
      const primaryMenuButtons = document.querySelectorAll('.primaryMenuButton')
      primaryMenuButtons.forEach(button => {
        button.addEventListener('click', (event) => {
          const target = event.currentTarget as HTMLElement
          const category = target.getAttribute('data-category')
          
          // 移除所有按钮的active状态
          primaryMenuButtons.forEach(btn => btn.classList.remove('active'))
          
          if (category) {
            // 必须选中一个按钮，不能取消选中
            this.selectedCategoryRef.value = category
            target.classList.add('active')
            
            if (category === 'view') {
              // 选中View时隐藏二级菜单，页面向上填充
              this.hideSecondaryToolbar()
            } else {
              // 选中其他按钮时显示二级菜单，页面向下移
              this.showSecondaryToolbar()
              // 重新渲染工具栏以应用过滤
              this.updateToolbarCategory()
            }
          }
        })
      })

      // 设置批注按钮事件
      const annotationToggleButton = document.getElementById('annotationToggleButton')
      if (annotationToggleButton) {
        // 初始化状态
        const isInitiallyOpen = this.getOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) === 'true'
        if (isInitiallyOpen) {
          annotationToggleButton.classList.add('toggled')
        }

        annotationToggleButton.addEventListener('click', () => {
          const isCurrentlyOpen = this.isCommentOpen()
          this.toggleComment(!isCurrentlyOpen)
          this.connectorLine?.clearConnection()
          
          // 更新按钮状态
          if (!isCurrentlyOpen) {
            annotationToggleButton.classList.add('toggled')
          } else {
            annotationToggleButton.classList.remove('toggled')
          }
        })
      }

      // 设置保存和导出按钮事件
      const saveButton = document.getElementById('saveButton')
      if (saveButton) {
        saveButton.addEventListener('click', () => {
          this.saveData()
        })
      }

      const exportButton = document.getElementById('exportButton')
      if (exportButton) {
        exportButton.addEventListener('click', () => {
          // 可以显示导出选项菜单或直接导出PDF
          this.exportPdf()
        })
      }
    }, 100)
  }

  private hideSecondaryToolbar(): void {
    const customToolbar = document.querySelector('.CustomToolbar') as HTMLElement
    if (customToolbar) {
      customToolbar.style.display = 'none'
    }
    // 页面向上填充
    document.body.classList.add('PdfjsAnnotationExtension_SecondaryToolbar_hidden')
  }

  private showSecondaryToolbar(): void {
    const customToolbar = document.querySelector('.CustomToolbar') as HTMLElement
    if (customToolbar) {
      customToolbar.style.display = 'block'
    }
    // 页面向下移，留出二级菜单的位置
    document.body.classList.remove('PdfjsAnnotationExtension_SecondaryToolbar_hidden')
  }

  private updateToolbarCategory(): void {
    // 因为Vue组件使用的是响应式ref，我们需要重新创建组件实例
    if (this.customToolbarRef.value) {
      // 获取当前工具栏容器
      const currentEl = this.customToolbarRef.value.$el
      if (currentEl && currentEl.parentNode) {
        // 移除当前实例
        currentEl.parentNode.removeChild(currentEl)
      }
      
      // 重新创建工具栏
      const el = document.createElement('div')
      this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', el)
      const app = createConfiguredApp(CustomToolbar, {
        defaultAnnotationName: this.getOption(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE),
        userName: this.getOption(HASH_PARAMS_USERNAME),
        selectedCategory: this.selectedCategoryRef.value,
        onChange: (currentAnnotation: IAnnotationType | null, dataTransfer: string | null) => {
          this.painter.activate(currentAnnotation, dataTransfer)
        },
        onSave: () => this.saveData(),
        onExport: async (type: string) => {
          if (type === 'excel') {
            this.exportExcel()
          } else if (type === 'pdf') {
            await this.exportPdf()
          }
        },
        onUndo: () => this.handleUndo(),
        onRedo: () => this.handleRedo(),
        onEraser: () => this.handleEraser()
      })
      const instance = app.mount(el)
      this.customToolbarRef.value = instance
    }
  }

  // Vue3 组件挂载
  private renderToolbar() {
    const el = document.createElement('div')
    this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', el)
    const app = createConfiguredApp(CustomToolbar, {
      defaultAnnotationName: this.getOption(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE),
      userName: this.getOption(HASH_PARAMS_USERNAME),
      selectedCategory: this.selectedCategoryRef.value,
      onChange: (currentAnnotation: IAnnotationType | null, dataTransfer: string | null) => {
        this.painter.activate(currentAnnotation, dataTransfer)
      },
      onSave: () => this.saveData(),
      onExport: async (type: string) => {
        if (type === 'excel') {
          this.exportExcel()
        } else if (type === 'pdf') {
          await this.exportPdf()
        }
      },
      onUndo: () => this.handleUndo(),
      onRedo: () => this.handleRedo(),
      onEraser: () => this.handleEraser()
    })
    const instance = app.mount(el)
    this.customToolbarRef.value = instance
  }

  private renderPopBar() {
    const el = document.createElement('div')
    // 恢复到原始挂载方式：挂载到body，而不是viewerContainer内部
    // 这样floating-ui就能正常使用viewport坐标系
    document.body.appendChild(el)
    const app = createConfiguredApp(CustomPopbar, {
      onChange: (currentAnnotation: IAnnotationType, range: Range) => {
        this.painter.highlightRange(range, currentAnnotation)
      },
    })
    const instance = app.mount(el)
    // 手动设置 ref
    this.customPopbarRef.value = instance
  }

  private renderAnnotationMenu() {
    const el = document.createElement('div')
    this.$PDFJS_outerContainer.insertAdjacentElement('afterend', el)
    const app = createConfiguredApp(CustomAnnotationMenu, {
      onOpenComment: (annotation: any) => {
        this.toggleComment(true)
        // 更新批注按钮状态
        const annotationToggleButton = document.getElementById('annotationToggleButton')
        if (annotationToggleButton) {
          annotationToggleButton.classList.add('toggled')
        }
        setTimeout(() => {
          this.customCommentRef.value?.selectedAnnotation(annotation, true)
        }, 100)
      },
      onChangeStyle: (annotation: IAnnotationStore, style: IAnnotationStyle) => {
        this.painter.updateAnnotationStyle(annotation, style)
        this.customToolbarRef.value?.updateStyle(annotation.type, style)
      },
      onDelete: (annotation: { id: string }) => {
        this.painter.delete(annotation.id, true)
      },
    })
    const instance = app.mount(el)
    this.customerAnnotationMenuRef.value = instance
  }

  private renderComment() {
    const el = document.createElement('div')
    this.$PDFJS_mainContainer.insertAdjacentElement('afterend', el)
    const app = createConfiguredApp(CustomComment, {
      userName: this.getOption(HASH_PARAMS_USERNAME),
      onSelected: async (annotation: IAnnotationStore) => {
        await this.painter.highlight(annotation)
      },
      onDelete: (id: string) => {
        this.painter.delete(id)
      },
      onUpdate: (annotation: { id: string; title: any; contentsObj: any; comments: any }) => {
        this.painter.update(annotation.id, {
          title: annotation.title,
          contentsObj: annotation.contentsObj,
          comments: annotation.comments,
        })
      },
      onScroll: () => {
        this.connectorLine?.clearConnection()
      },
    })
    const instance = app.mount(el)
    this.customCommentRef.value = instance
  }

    /**
     * @description 隐藏 PDF.js 编辑模式按钮
     */
    private hidePdfjsEditorModeButtons(): void {
      defaultOptions.setting.HIDE_PDFJS_ELEMENT.forEach(item => {
          const element = document.querySelector(item) as HTMLElement;
          if (element) {
              element.style.display = 'none';
              const nextDiv = element.nextElementSibling as HTMLElement;
              if (nextDiv.classList.contains('horizontalToolbarSeparator')) {
                  nextDiv.style.display = 'none'
              }
          }
      });
  }

  private updatePdfjs() {
      const currentScaleValue = this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue
      if (
          currentScaleValue === 'auto' ||
          currentScaleValue === 'page-fit' ||
          currentScaleValue === 'page-width'
      ) {
          this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = '0.8'
          this.PDFJS_PDFViewerApplication.pdfViewer.update()
      } else {
          this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = 'auto'
          this.PDFJS_PDFViewerApplication.pdfViewer.update()
      }
      this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = currentScaleValue
      this.PDFJS_PDFViewerApplication.pdfViewer.update()
  }

  /**
   * @description 绑定 PDF.js 相关事件
   */
  private bindPdfjsEvents(): void {
      this.hidePdfjsEditorModeButtons()
      const setLoadEnd = once(() => {
          this.loadEnd = true
      })

      // 视图更新时隐藏菜单
      this.PDFJS_EventBus._on('updateviewarea', () => {
          this.customerAnnotationMenuRef.value?.close()
          this.connectorLine?.clearConnection()
      })

      // 监听页面渲染完成事件
      this.PDFJS_EventBus._on(
          'pagerendered',
          async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
              setLoadEnd()
              
              // 进一步增加延迟时间，给PDF.js更多时间完成所有内部操作
              // 包括annotation layer的渲染和link injection
              setTimeout(() => {
                  // 检查页面是否仍然存在且完全渲染完成
                  if (source && source.renderingState === 3 && source.div && source.viewport) {
                      // 再次检查页面是否还在DOM中
                      if (document.contains(source.div)) {
                          this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
                      }
                  }
              }, 500) // 增加到 500ms 延迟，确保 PDF.js 完全完成内部操作
          }
      )

      // 监听文档加载完成事件
      this.PDFJS_EventBus._on('documentloaded', async () => {
          this.painter.initWebSelection(this.$PDFJS_viewerContainer)
          const data = await this.getData()
          this.initialDataHash = hashArrayOfObjects(data)
          await this.painter.initAnnotations(data, defaultOptions.setting.LOAD_PDF_ANNOTATION)
          if (this.loadEnd) {
              this.updatePdfjs()
          }
      })
  }

  /**
   * @description 获取外部批注数据
   * @returns 
   */
  private async getData(): Promise<any[]> {
      const getUrl = this.getOption(HASH_PARAMS_GET_URL);
      if (!getUrl) {
          return [];
      }
      try {
          message.open({
              type: 'loading',
              content: t('normal.processing'),
              duration: 0,
          });
          const response = await fetch(getUrl, { method: 'GET' });

          if (!response.ok) {
              const errorMessage = `HTTP Error ${response.status}: ${response.statusText || 'Unknown Status'}`;
              throw new Error(errorMessage);
          }
          return await response.json();
      } catch (error) {
          Modal.error({
              content: t('load.fail', { value: (error as Error)?.message }),
              closable: false,
              okButtonProps: {
                  loading: false
              },
              okText: t('normal.ok')
          })
          console.error('Fetch error:', error);
          return [];
      } finally {
          message.destroy();
      }
  }

    
  /**
   * @description 保存批注数据
   */
  private async saveData(): Promise<void> {
    const dataToSave = this.painter.getData()
    console.log(
      '%c [ dataToSave ]',
      'font-size:13px; background:#d10d00; color:#ff5144;',
      dataToSave,
    )

    const postUrl = this.getOption(HASH_PARAMS_POST_URL)
    if (!postUrl) {
      message.error({
        content: t('save.noPostUrl', { value: HASH_PARAMS_POST_URL }),
        key: 'save',
      })
      return
    }

    const modal = Modal.info({
      content: h(Space, null, {
        default: () => [h(SyncOutlined, { spin: true }), t('save.start')],
      }),
      closable: false,
      okButtonProps: {
        loading: true,
      },
      okText: t('normal.ok'),
    })

    try {
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })

      if (!response.ok) {
        throw new Error(
          `Failed to save PDF. Status: ${response.status} ${response.statusText}`,
        )
      }

      const result = await response.json()
      this.initialDataHash = hashArrayOfObjects(dataToSave)

      modal.destroy()
      message.success({
        content: t('save.success'),
        key: 'save',
      })
      console.log('Saved successfully:', result)
    } catch (error: any) {
      modal.update({
        type: 'error',
        content: error?.message || t('save.fail', { value: '' }),
        closable: true,
        okButtonProps: {
          loading: false,
        },
      })
      console.error('Error while saving data:', error)
    }
  }
  private async exportPdf() {
    const dataToSave = this.painter.getData()
  
    const modal = Modal.info({
      title: t('normal.export'),
      content: h(Space, null, {
        default: () => [h(SyncOutlined, { spin: true }), t('normal.processing')],
      }),
      closable: false,
      okButtonProps: {
        loading: true,
      },
      okText: t('normal.ok'),
    })
  
    await exportAnnotationsToPdf(this.PDFJS_PDFViewerApplication, dataToSave)
  
    modal.update({
      type: 'success',
      title: t('normal.export'),
      content: t('pdf.generationSuccess'),
      closable: true,
      okButtonProps: {
        loading: false,
      },
    })
  }

  private async exportExcel() {
      const annotations = this.painter.getData()
      await exportAnnotationsToExcel(this.PDFJS_PDFViewerApplication, annotations)
      Modal.info({
          type: 'success',
          title: t('normal.export'),
          content: t('pdf.generationSuccess'),
          closable: true,
          okButtonProps: {
              loading: false
          },
      })
  }

  private handleUndo(): void {
    // 调用painter的撤销功能
    if (this.painter) {
      this.painter.undo()
    }
  }

  private handleRedo(): void {
    // 调用painter的重做功能
    if (this.painter) {
      this.painter.redo()
    }
  }

  private handleEraser(): void {
    // 激活擦除模式
    if (this.painter) {
      this.painter.activateEraser()
    }
  }

  public hasUnsavedChanges(): boolean {
      return hashArrayOfObjects(this.painter.getData()) !== this.initialDataHash
  }

}

declare global {
  interface Window {
    pdfjsAnnotationExtensionInstance: PdfjsAnnotationExtension
  }
}

window.pdfjsAnnotationExtensionInstance = new PdfjsAnnotationExtension()
