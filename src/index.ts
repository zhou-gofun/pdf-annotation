// import 'element-ui/lib/theme-chalk/index.css'
// import './scss/app.scss'
import { createApp } from 'vue'
// 导入自定义侧边栏组件
import CustomToolbar from './components/toolbar/CustomToolbar.vue'
// import CustomSidebar from './components/CustomSidebar.vue'
import { Painter } from './painter/painter'
import { WebSelection } from './webselection/webselection'
import { ActionsValue, type ActionValueType } from './actions/actions'
import type { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { HASH_PARAMS_DEFAULT_EDITOR_ACTIVE, HASH_PARAMS_DEFAULT_SIDEBAR_OPEN, HASH_PARAMS_GET_URL, HASH_PARAMS_POST_URL, HASH_PARAMS_USERNAME } from './const/definitions'
// import i18n from 'i18next'
import { defaultOptions } from './const/default_options'
import { ConnectorLine } from './painter/connectorLine.ts'
// import { createI18n } from 'vue-i18n'
import { initializeI18n } from './locale/index.ts'
import i18n from './locale/index.ts'
// import Antd from 'ant-design-vue'


interface AppOptions {
  [key: string]: string;
}
class ThirdPartyBase {
  PDFJS_PDFViewerApplication: PDFViewerApplication
  PDFJS_EventBus: EventBus
  $PDFJS_sidebarContainer: HTMLDivElement
  $PDFJS_toolbar_container: HTMLDivElement

  customToolbarRef: any
  customSidebarRef: any

  painter: Painter
  appOptions: AppOptions
  WebSelection: WebSelection
  currentAction: typeof ActionsValue | null
  _connectorLine: ConnectorLine | null = null

  constructor() {
    this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
    this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
    this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
    this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container

    this.customToolbarRef = null
    this.customSidebarRef = null
    initializeI18n(this.PDFJS_PDFViewerApplication.l10n.getLanguage())
    this.appOptions = {
      [HASH_PARAMS_USERNAME]: "user", // 默认用户名,
      // [HASH_PARAMS_USERNAME]: i18n.t('normal.unknownUser'), // 默认用户名,
      [HASH_PARAMS_GET_URL]: defaultOptions.setting.HASH_PARAMS_GET_URL, // 默认 GET URL
      [HASH_PARAMS_POST_URL]: defaultOptions.setting.HASH_PARAMS_POST_URL, // 默认 POST URL
      [HASH_PARAMS_DEFAULT_EDITOR_ACTIVE]: defaultOptions.setting.HASH_PARAMS_DEFAULT_EDITOR_ACTIVE,
      [HASH_PARAMS_DEFAULT_SIDEBAR_OPEN]: defaultOptions.setting.HASH_PARAMS_DEFAULT_SIDEBAR_OPEN,
  };
    this.painter = new Painter()
    this.WebSelection = new WebSelection({
      onSelect: (pageNumber: any, elements: any) => {
        if (this.currentAction) {
          this.painter.drawWebSelectionToKonva(pageNumber, this.currentAction as unknown as ActionValueType, elements)
        }
      }
    })

    this.currentAction = null
  //   this.painter = new Painter({
  //     userName: this.getOption(HASH_PARAMS_USERNAME),
  //     PDFViewerApplication: this.PDFJS_PDFViewerApplication,
  //     PDFJS_EventBus: this.PDFJS_EventBus,
  //     setDefaultMode: () => {
  //         this.customToolbarRef.current.activeAnnotation(annotationDefinitions[0])
  //     },
  //     onWebSelectionSelected: range => {
  //         this.customPopbarRef.current.open(range)
  //     },
  //     onStoreAdd: (annotation, isOriginal, currentAnnotation) => {
  //         this.customCommentRef.current.addAnnotation(annotation)
  //         if (isOriginal) return
  //         if (currentAnnotation.isOnce) {
  //             this.painter.selectAnnotation(annotation.id)
  //         }
  //         if (this.isCommentOpen()) {
  //             // 如果评论栏已打开，则选中批注
  //             this.customCommentRef.current.selectedAnnotation(annotation, true)
  //         }
  //     },
  //     onStoreDelete: (id) => {
  //         this.customCommentRef.current.delAnnotation(id)
  //     },
  //     onAnnotationSelected: (annotation, isClick, selectorRect) => {
  //         this.customerAnnotationMenuRef.current.open(annotation, selectorRect)
  //         if (isClick && this.isCommentOpen()) {
  //             // 如果是点击事件并且评论栏已打开，则选中批注
  //             this.customCommentRef.current.selectedAnnotation(annotation, isClick)
  //         }

  //         this.connectorLine?.drawConnection(annotation, selectorRect)
  //     },
  //     onAnnotationChange: (annotation) => {
  //         this.customCommentRef.current.updateAnnotation(annotation)
  //     },
  //     onAnnotationChanging: () => {
  //         this.connectorLine?.clearConnection()
  //         this.customerAnnotationMenuRef?.current?.close()
  //     },
  //     onAnnotationChanged: (annotation, selectorRect) => {
  //         console.log('annotation changed', annotation)
  //         this.connectorLine?.drawConnection(annotation, selectorRect)
  //         this.customerAnnotationMenuRef?.current?.open(annotation, selectorRect)
  //     },
  // })
    this.init()
  }

  private init() {
    this.coverStyle()
    this.bindPdfjsEvent()
    // this.renderToolbar()
    this.PDFJS_PDFViewerApplication.initializedPromise.then(() => {
      this.renderToolbar()
      // this.renderSidebar()
    })
  }

  private coverStyle() {
    document.body.classList.add('ThirdPartyBase_Style')
  }
  // private setOption(name: string, value: string) {
  //     this.appOptions[name] = value
  // }

  private getOption(name: string) {
      return this.appOptions[name]
  }
  /**
   * @description 渲染自定义工具栏
   */
  private renderToolbar() {
    const toolbar = document.createElement('div')
    this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', toolbar)
  
    const defaultAnnotation = this.getOption(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE)
    const sidebarOpen = this.getOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN)
  
    const app = createApp(CustomToolbar, {
      defaultAnnotationName: defaultAnnotation === "null" ? null : defaultAnnotation,
      defaultSidebarOpen: sidebarOpen === "true",
      userName: this.getOption(HASH_PARAMS_USERNAME),
      onChange: (currentAnnotation: any, dataTransfer: any) => {
        this.painter.activate(currentAnnotation, dataTransfer)
      },
      onSave: () => this.saveData(),
      onExport: async (type: string) => {
        if (type === 'excel') return this.exportExcel()
        if (type === 'pdf') return this.exportPdf()
      },
      onSidebarOpen: (isOpen: boolean) => {
        this.toggleComment(isOpen)
        this.connectorLine?.clearConnection()
      }
    })
  
    // app.use(Antd)
    app.use(i18n) // ⚠️ 必须加
    this.customToolbarRef = app.mount(toolbar)
  }

  exportPdf() {
    throw new Error('Method not implemented.')
  }
  exportExcel() {
    throw new Error('Method not implemented.')
  }
  saveData() {
    throw new Error('Method not implemented.')
  }
  /**
     * @description 切换评论栏的显示状态
     * @param open 
     */
  private toggleComment(open: boolean): void {
    if (open) {
        document.body.classList.remove('PdfjsAnnotationExtension_Comment_hidden')
    } else {
        document.body.classList.add('PdfjsAnnotationExtension_Comment_hidden')
    }
  }
  get connectorLine(): ConnectorLine | null {
    if (defaultOptions.connectorLine.ENABLED) {
        this._connectorLine = new ConnectorLine({})
    }
    return this._connectorLine
  }
  

  // private renderSidebar() {
  //   const sidebarContainer = document.createElement('div')
  //   this.$PDFJS_sidebarContainer.insertAdjacentElement('afterend', sidebarContainer)
  
  //   // 直接在 createApp 时传 props
  //   const app = createApp(CustomSidebar, {
  //     onClick: (index: number) => {
  //       this.PDFJS_PDFViewerApplication.page = index + 1
  //     }
  //   })
  
  //   app.use(Antd)
  //   this.customSidebarRef = app.mount(sidebarContainer)
  // }

  private bindPdfjsEvent() {
    this.PDFJS_EventBus._on('pagerendered', async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
      if (cssTransform) {
        this.painter.scaleCanvas({
          viewport: source.viewport,
          pageNumber: source.id
        })
        return
      }
      this.painter.insertCanvas({
        pageNumber: source.id,
        pageDiv: source.div,
        viewport: source.viewport
      })
      this.WebSelection.disable()
      this.WebSelection.create(source.div, pageNumber)
    })

    this.PDFJS_EventBus._on('pagechanging', ({ pageNumber }: { pageNumber: number }) => {
      console.log(`pagechanging: ${pageNumber}`)
    })
  }
}

new ThirdPartyBase()
