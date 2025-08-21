import type { EventBus, PageViewport, PDFPageView, PDFViewerApplication } from 'pdfjs'; // 导入 PageViewport 类型
 // 导入 PageViewport 类型
// import { PageViewport, PDFViewerApplication } from 'pdfjs-dist/web/pdf_viewer'
import './painter.scss'
import Konva from 'konva'
import type { IAnnotationStore, IAnnotationStyle, IAnnotationType } from '../const/definitions.ts'
import { annotationDefinitions, Annotation } from '../const/definitions.ts'
import { CURSOR_CSS_PROPERTY, PAINTER_IS_PAINTING_STYLE, PAINTER_PAINTING_TYPE, PAINTER_WRAPPER_PREFIX } from './const.ts'
import { isElementInDOM, removeCssCustomProperty } from '../utils/utils.ts'

import { Editor } from './editor/editor.ts'
import { EditorCircle } from './editor/editor_circle.ts'
import { EditorFreeHand } from './editor/editor_free_hand.ts'
import { EditorFreeHighlight } from './editor/editor_free_highlight.ts'
import { EditorFreeText } from './editor/editor_free_text.tsx'
import { EditorHighLight } from './editor/editor_highlight.ts'
import { EditorRectangle } from './editor/editor_rectangle.ts'
import { EditorSignature } from './editor/editor_signature.ts'
import { EditorStamp } from './editor/editor_stamp.tsx'
import { EditorNote } from './editor/editor_note.ts'
import { Selector } from './editor/selector.tsx'
import { Store } from './store.ts'
import { WebSelection } from './webSelection.ts'
import { Transform } from './transform/transform.ts'
import { EditorArrow } from './editor/editor_arrow.ts'
import { EditorCloud } from './editor/editor_cloud.ts'
import type { IRect } from 'konva/lib/types'



// KonvaCanvas 接口定义
export interface KonvaCanvas {
    pageNumber: number
    konvaStage: Konva.Stage
    wrapper: HTMLDivElement
    isActive: boolean
}
export class Painter {
    private userName: string
    private konvaCanvasStore: Map<number, KonvaCanvas> = new Map() // 存储 KonvaCanvas 实例
    private editorStore: Map<string, Editor> = new Map() // 存储编辑器实例
    private pdfViewerApplication: PDFViewerApplication // PDFViewerApplication 实例
    private webSelection: WebSelection // WebSelection 实例
    private currentAnnotation: IAnnotationType | null = null // 当前批注类型
    private store: Store // 存储实例
    private selector: Selector // 选择器实例
    private transform: Transform // 转换器
    private tempDataTransfer: string | null | undefined // 临时数据传输
    public readonly setDefaultMode: () => void // 设置默认模式的函数引用
    public readonly onWebSelectionSelected: (range: Range) => void
    public readonly onStoreAdd: (annotationStore: IAnnotationStore, isOriginal: boolean, currentAnnotation: IAnnotationType) => void
    public readonly onStoreDelete: (id: string) => void
    public readonly onAnnotationSelected: (annotationStore: IAnnotationStore, isClick: boolean, selectorRect: IRect) => void
    public readonly onAnnotationChange: (annotationStore: IAnnotationStore) => void
    public readonly onAnnotationChanging: () => void // 批注正在更改的回调函数
    public readonly onAnnotationChanged: (annotationStore: IAnnotationStore, selectorRect: IRect) => void // 批注已更改的回调函数


    private konvaMap = new Map<number, Konva.Stage>()

    pdfjsEventBus: EventBus // PDF.js EventBus 实例
    

    constructor({
        userName,
        PDFViewerApplication,
        PDFJS_EventBus,
        setDefaultMode,
        onWebSelectionSelected,
        onStoreAdd,
        onStoreDelete,
        onAnnotationSelected,
        onAnnotationChange,
        onAnnotationChanging,
        onAnnotationChanged
    }: {
        userName: string
        PDFViewerApplication: PDFViewerApplication
        PDFJS_EventBus: EventBus
        setDefaultMode: () => void
        onWebSelectionSelected: (range: Range) => void
        onStoreAdd: (annotationStore: IAnnotationStore, isOriginal: boolean, currentAnnotation: IAnnotationType) => void
        onStoreDelete: (id: string) => void
        onAnnotationSelected: (annotationStore: IAnnotationStore, isClick: boolean, selectorRect: IRect) => void
        onAnnotationChange: (annotationStore: IAnnotationStore) => void
        onAnnotationChanging: () => void
        onAnnotationChanged: (annotationStore: IAnnotationStore, selectorRect: IRect) => void
    }) {
        this.userName = userName
        this.pdfViewerApplication = PDFViewerApplication // 初始化 PDFViewerApplication
        this.pdfjsEventBus = PDFJS_EventBus // 初始化 PDF.js EventBus
        this.setDefaultMode = setDefaultMode // 设置默认模式的函数
        this.onWebSelectionSelected = onWebSelectionSelected
        this.onStoreAdd = onStoreAdd
        this.onStoreDelete = onStoreDelete
        this.onAnnotationSelected = onAnnotationSelected
        this.onAnnotationChange = onAnnotationChange
        this.onAnnotationChanging = onAnnotationChanging // 批注正在更改的回调函数
        this.onAnnotationChanged = onAnnotationChanged // 批注已更改的回调函数
        this.store = new Store({ PDFViewerApplication }) // 初始化存储实例
        this.selector = new Selector({
            // 初始化选择器实例
            konvaCanvasStore: this.konvaCanvasStore,
            getAnnotationStore: (id: string): IAnnotationStore => {
                const annotation = this.store.annotation(id)
                if (!annotation) {
                    throw new Error(`找不到ID为${id}的标注`)
                }
                return annotation
            },
            onSelected: (id, isClick, transformerRect) => {
                const annotation = this.store.annotation(id)
                if (!annotation) {
                    throw new Error(`找不到ID为${id}的标注`)
                }
                this.onAnnotationSelected(annotation, isClick, transformerRect)
            },
            onChanged: async (id, groupString, _rawAnnotationStore, konvaClientRect, transformerRect) => {
                const editor = this.findEditorForGroupId(id)
                if (editor) {
                    this.updateStore(id, { konvaString: groupString, konvaClientRect })
                }
                const annotation = this.store.annotation(id)
                if (!annotation) {
                    throw new Error(`找不到ID为${id}的标注`)
                }
                this.onAnnotationChanged(annotation, transformerRect)
            },
            onCancel: () => {
                this.onAnnotationChanging() // 批注正在更改的回调
            },
            onDelete: id => {
                this.deleteAnnotation(id, true)
            }
        })
        this.webSelection = new WebSelection({
            // 初始化 WebSelection 实例
            onSelect: range => {
                if (range) {
                    this.onWebSelectionSelected(range)
                }
            },
            onHighlight: selection => {
                Object.keys(selection).forEach(key => {
                    const pageNumber = Number(key)
                    const elements = selection[pageNumber]
                    const canvas = this.konvaCanvasStore.get(pageNumber)
                    if (canvas) {
                        const { konvaStage, wrapper } = canvas
                        let storeEditor = this.findEditor(pageNumber, this.currentAnnotation?.type) as EditorHighLight
                        if (!storeEditor) {
                            storeEditor = new EditorHighLight(
                                {
                                    userName: this.userName,
                                    pdfViewerApplication: this.pdfViewerApplication,
                                    konvaStage,
                                    pageNumber,
                                    annotation: this.currentAnnotation,
                                    onAdd: annotationStore => {
                                        this.saveToStore(annotationStore)
                                    },
                                    onChange: (id, updates) => {
                                        this.updateStore(id, updates) // 更新存储
                                    }
                                },
                                this.currentAnnotation?.type ?? Annotation.HIGHLIGHT
                            )
                            this.editorStore.set(storeEditor.id, storeEditor)
                        }
                        if (elements) {
                            storeEditor.convertTextSelection(elements, wrapper)
                        }
                    }
                })
            }
        })
        this.transform = new Transform(PDFViewerApplication)
        this.bindGlobalEvents() // 绑定全局事件
            
        // this.PDFViewerApplication = (window as any).PDFViewerApplication
    }

    /**
     * 绑定全局事件。
     */
    private bindGlobalEvents(): void {
        window.addEventListener('keyup', this.globalKeyUpHandler) // 监听全局键盘事件
    }
    /**
     * 全局键盘抬起事件处理器。
     * @param e - 键盘事件。
     */
    private globalKeyUpHandler = (e: KeyboardEvent): void => {
        if (e.code === 'Escape' && (this.currentAnnotation?.type === Annotation.SIGNATURE || this.currentAnnotation?.type === Annotation.STAMP)) {
            removeCssCustomProperty(CURSOR_CSS_PROPERTY) // 移除自定义 CSS 属性
            this.setDefaultMode() // 设置默认模式
        }
    }


    /**
     * 重新绘制批注
     * @param pageNumber - 页码
     */
    private reDrawAnnotation(pageNumber: number): void {
        const konvaCanvasStore = this.konvaCanvasStore.get(pageNumber) // 获取 KonvaCanvas 实例
        const annotationStores = this.store.getByPage(pageNumber) // 获取指定页码的批注存储
        annotationStores.forEach(annotationStore => {
            let storeEditor = this.findEditor(pageNumber, annotationStore.type) // 查找编辑器实例
            if (!storeEditor) {
                // 如果编辑器不存在，启用编辑器
                const annotationDefinition = annotationDefinitions.find(item => item.type === annotationStore.type)
                if (konvaCanvasStore && konvaCanvasStore.konvaStage) {
                    if (annotationDefinition) {
                        this.enableEditor({ konvaStage: konvaCanvasStore.konvaStage, pageNumber, annotation: annotationDefinition })
                    }
                }
                storeEditor = this.findEditor(pageNumber, annotationStore.type) // 重新查找编辑器
            }

            if (storeEditor) {
                // 添加序列化组到图层
                if (konvaCanvasStore?.konvaStage) {
                    storeEditor.addSerializedGroupToLayer(konvaCanvasStore.konvaStage, annotationStore.konvaString)
                }
            }
        })
    }

    /**
     * 删除批注
     * @param id - 批注 ID
     */
    private deleteAnnotation(id: string, emit: boolean = false): void {
        const annotationStore = this.store.annotation(id)
        // 检查 annotationStore 是否存在
        if (!annotationStore) {
            return;
        }
        const konvaCanvasStore = this.konvaCanvasStore.get(annotationStore.pageNumber) // 获取 KonvaCanvas 实例
        // 检查 konvaCanvasStore 是否存在
        if (!konvaCanvasStore) {
            return;
        }
        this.store.delete(id)
        const storeEditor = this.findEditor(annotationStore.pageNumber, annotationStore.type)
        if (storeEditor) {
            storeEditor.deleteGroup(id, konvaCanvasStore.konvaStage)
        }
        if (emit) {
            this.onStoreDelete(id)
        }
    }

    private disablePainting(): void {
        this.setMode('default') // 设置默认模式
        this.clearTempDataTransfer() // 清除临时数据传输
        // this.selector.clear() // 清除选择器
        console.log('Painting mode disabled')
    }
    /**
     * 保存临时数据传输
     * @param data - 数据
     * @returns 临时数据传输
     */
    private saveTempDataTransfer(data: string): string {
        this.tempDataTransfer = data
        return this.tempDataTransfer
    }

    /**
     * 清除临时数据传输
     * @returns 临时数据传输
     */
    private clearTempDataTransfer(): string {
        this.tempDataTransfer = null
        return this.tempDataTransfer ?? ''
    }


    /**
     * 初始化或更新 KonvaCanvas
     * @param params - 包含当前 PDF 页面视图、是否需要 CSS 转换和页码的对象
     */
    public initCanvas({ pageView, cssTransform, pageNumber }: { pageView: PDFPageView; cssTransform: boolean; pageNumber: number }): void {
        if (cssTransform) {
            this.scaleCanvas(pageView, pageNumber)
        } else {
            this.insertCanvas(pageView, pageNumber)
        }
    }


    private setMode(mode: 'painting' | 'default'): void {
        const isPainting = mode === 'painting' // 是否绘画模式
        document.body.classList.toggle(`${PAINTER_IS_PAINTING_STYLE}`, isPainting) // 添加或移除绘画模式样式
        const allAnnotationClasses = Object.values(Annotation)
            .filter(type => typeof type === 'number')
            .map(type => `${PAINTER_PAINTING_TYPE}_${type}`)
        // 移除所有可能存在的批注类型样式
        allAnnotationClasses.forEach(cls => document.body.classList.remove(cls))
        // 移出签名鼠标指针变量
        removeCssCustomProperty(CURSOR_CSS_PROPERTY)

        if (this.currentAnnotation) {
            document.body.classList.add(`${PAINTER_PAINTING_TYPE}_${this.currentAnnotation?.type}`)
        }
    }

    /**
     * 保存到存储
     */
    private saveToStore(annotationStore: IAnnotationStore, isOriginal: boolean = false) {
        const currentAnnotation = annotationDefinitions.find(item => item.pdfjsAnnotationType === annotationStore.pdfjsType)
        if (currentAnnotation) {
            this.onStoreAdd(this.store.save(annotationStore, isOriginal), isOriginal, currentAnnotation)
        }
    }

    /**
     * 更新存储
     */
    private updateStore(id: string, updates: Partial<IAnnotationStore>) {
        const updatedStore = this.store.update(id, updates)
        if (updatedStore) {
            this.onAnnotationChange(updatedStore)
        }
    }

    /**
     * 根据组 ID 查找编辑器
     * @param groupId - 组 ID
     * @returns 编辑器实例
     */
    private findEditorForGroupId(groupId: string): Editor {
        let editor: Editor | undefined = undefined
        this.editorStore.forEach(_editor => {
            if (_editor.shapeGroupStore?.has(groupId)) {
                editor = _editor
                return
            }
        })
        // 如果找不到编辑器则抛出错误
        if (!editor) {
            throw new Error('找不到对应的编辑器')
        }
        return editor as Editor
    }


    /**
     * 初始化 WebSelection
     * @param rootElement - 根 DOM 元素
     */
    public initWebSelection(rootElement: HTMLDivElement): void {
        this.webSelection.create(rootElement)
    }

    public activate(annotation: IAnnotationType | null, dataTransfer: string | null): void {
        this.currentAnnotation = annotation
        this.disablePainting()
        this.saveTempDataTransfer(dataTransfer ?? '')

        if (!annotation) {
            return
        }

        console.log(`Painting mode active type: ${annotation.type} | pdfjs annotationStorage type: ${annotation.pdfjsEditorType}`)
        switch (annotation.type) {
            case Annotation.FREETEXT:
            case Annotation.RECTANGLE:
            case Annotation.CIRCLE:
            case Annotation.FREEHAND:
            case Annotation.FREE_HIGHLIGHT:
            case Annotation.SIGNATURE:
            case Annotation.STAMP:
            case Annotation.SELECT:
            case Annotation.NOTE:
            case Annotation.ARROW:
            case Annotation.CLOUD:
                this.setMode('painting') // 设置绘画模式
                break

            default:
                this.setMode('default') // 设置默认模式
                break
        }

        this.enablePainting()
    }


    /**
     * 重置 PDF.js 批注存储
     */
    public resetPdfjsAnnotationStorage(): void {}

    /**
     * @description 根据 range 加亮
     * @param range
     * @param annotation
     */
    public highlightRange(range: Range, annotation: IAnnotationType) {
        this.currentAnnotation = annotation
        this.webSelection.highlight(range)
    }

    /**
     * @description 选中对应 ID 批注
     * @param id
     */
    public selectAnnotation(id: string) {
        this.setDefaultMode()
        this.selector.select(id)
    }

    /**
     * @description 将annotation 存入 store, 包含外部 annotation 和 pdf 文件上的 annotation
     */
    public async initAnnotations(annotations: IAnnotationStore[], loadPdfAnnotation: boolean) {
        // 加载 pdf 文件批注
        if (loadPdfAnnotation) {
            // 先将 pdf 文件中的存入
            const annotationMap = await this.transform.decodePdfAnnotation()
            annotationMap.forEach(annotation => {
                this.saveToStore(annotation, true)
            })
            // 再用外部数据覆盖
            annotations.forEach(annotation => {
                if (annotationMap.has(annotation.id)) {
                    this.updateStore(annotation.id, annotation)
                } else {
                    this.saveToStore(annotation, true)
                }
            })
        } else {
            annotations.forEach(annotation => {
                this.saveToStore(annotation, true)
            })
        }
    }

    /**
     * @description 更新 store
     * @param id
     * @param updates
     */
    public update(id: string, updates: Partial<IAnnotationStore>) {
        this.store.update(id, updates)
    }

    /**
     * @description 删除 annotation
     * @param id
     */
    public delete(id: string, emit: boolean = false) {
        this.selector.delete()
        this.deleteAnnotation(id, emit)
    }



    /**
     * @description 高亮选中 annotation
     * @param annotation
     */
    public async highlight(annotation: IAnnotationStore) {
        // 跳转至对应页面位置
        const pageView = this.pdfViewerApplication.pdfViewer._pages[annotation.pageNumber - 1] || this.pdfViewerApplication.pdfViewer.getPageView(annotation.pageNumber)
        const { x, y } = annotation.konvaClientRect
        // 把 Konva 的左上角坐标转换为 PDF 内部坐标（以页面左下角为原点）
        const [pdfX, pdfY] = pageView.viewport.convertToPdfPoint(x, y - 200)
        this.pdfViewerApplication.pdfViewer.scrollPageIntoView({
            pageNumber: annotation.pageNumber,
            destArray: [null, { name: 'XYZ' }, pdfX, pdfY, null], // 可以加偏移
            allowNegativeOffset: true
        })

        const maxRetries = 5 // 最大重试次数
        const retryInterval = 200 // 每次重试间隔
        // 封装递归重试机制
        const attemptHighlight = (retries: number): void => {
            const storeEditor = this.findEditor(annotation.pageNumber, annotation.type)
            if (storeEditor) {
                this.setDefaultMode()
                this.selector.select(annotation.id)
                if (this.currentAnnotation && this.currentAnnotation.type === Annotation.SELECT) {
                    this.selector.activate(annotation.pageNumber)
                }
            } else if (retries > 0) {
                // 如果没有找到且还有重试次数，继续重试
                setTimeout(() => {
                    attemptHighlight(retries - 1)
                }, retryInterval)
            } else {
                console.error('Failed to find editor after maximum retries.')
            }
        }
        // 初次尝试执行
        attemptHighlight(maxRetries)
    }

    public getData() {
        return this.store.annotations
    }

    /**
     * @description 更新样式
     * @param annotationStore
     * @param styles
     */
    public updateAnnotationStyle(annotationStore: IAnnotationStore, style: IAnnotationStyle) {
        const editor = this.findEditorForGroupId(annotationStore.id)
        if (editor) {
            editor.updateStyle(annotationStore, style) // 更新编辑器样式
        }
    }
    
    /**
     * 根据页码和编辑器类型查找编辑器
     * @param pageNumber - 页码
     * @param editorType - 编辑器类型
     * @returns 编辑器实例
     */
    private findEditor(pageNumber: number, editorType: number | any): Editor | undefined {
        return this.editorStore.get(`${pageNumber}_${editorType}`)
    }
    /**
     * 启用特定类型的编辑器
     * @param options - 包含 Konva Stage、页码和批注类型的对象
     */
    private enableEditor({ konvaStage, pageNumber, annotation }: { konvaStage: Konva.Stage; pageNumber: number; annotation: IAnnotationType }): void {
        const storeEditor = this.findEditor(pageNumber, annotation.type) // 查找存储中的编辑器实例
        if (storeEditor) {
            if (storeEditor instanceof EditorSignature) {
                storeEditor.activateWithSignature(konvaStage, annotation, this.tempDataTransfer ?? null) // 激活带有签名的编辑器
                return
            }
            if (storeEditor instanceof EditorStamp) {
                storeEditor.activateWithStamp(konvaStage, annotation, this.tempDataTransfer ?? null) // 激活带有图章的编辑器
                return
            }
            storeEditor.activate(konvaStage, annotation) // 激活编辑器
            return
        }
        let editor: Editor | null = null // 初始化编辑器为空
        switch (annotation.type) {
            case Annotation.FREETEXT:
                editor = new EditorFreeText({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.RECTANGLE:
                editor = new EditorRectangle({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.ARROW:
                editor = new EditorArrow({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.CLOUD:
                editor = new EditorCloud({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.CIRCLE:
                editor = new EditorCircle({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.NOTE:
                editor = new EditorNote({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: () => {}
                })
                break
            case Annotation.FREEHAND:
                editor = new EditorFreeHand({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.FREE_HIGHLIGHT:
                editor = new EditorFreeHighlight({
                    userName: this.userName,
                    pdfViewerApplication: this.pdfViewerApplication,
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: annotationStore => {
                        this.saveToStore(annotationStore)
                    },
                    onChange: (id, updates) => {
                        this.updateStore(id, updates) // 更新存储
                    }
                })
                break
            case Annotation.SIGNATURE:
                editor = new EditorSignature(
                    {
                        userName: this.userName,
                        pdfViewerApplication: this.pdfViewerApplication,
                        konvaStage,
                        pageNumber,
                        annotation,
                        onAdd: annotationStore => {
                            this.saveToStore(annotationStore)
                        },
                        onChange: () => {}
                    },
                    this.tempDataTransfer ?? null
                )
                break
            case Annotation.STAMP:
                editor = new EditorStamp(
                    {
                        userName: this.userName,
                        pdfViewerApplication: this.pdfViewerApplication,
                        konvaStage,
                        pageNumber,
                        annotation,
                        onAdd: annotationStore => {
                            this.saveToStore(annotationStore)
                        },
                        onChange: () => {}
                    },
                    this.tempDataTransfer ?? null
                )
                break
            case Annotation.HIGHLIGHT:
            case Annotation.UNDERLINE:
            case Annotation.STRIKEOUT:
                editor = new EditorHighLight(
                    {
                        userName: this.userName,
                        pdfViewerApplication: this.pdfViewerApplication,
                        konvaStage,
                        pageNumber,
                        annotation,
                        onAdd: annotationStore => {
                            this.saveToStore(annotationStore)
                        },
                        onChange: (id, updates) => {
                            this.updateStore(id, updates) // 更新存储
                        }
                    },
                    annotation.type
                )
                break
            case Annotation.SELECT:
                this.selector.activate(pageNumber) // 激活选择器
                break

            default:
                console.warn(`未实现的批注类型: ${annotation.type}`)
                return
        }

        if (editor) {
            this.editorStore.set(editor.id, editor) // 将编辑器实例存储到 editorStore
        }
    }
    /**
     * 启用绘画
     */
    private enablePainting(): void {
        this.konvaCanvasStore.forEach(({ konvaStage, pageNumber }) => {
            // 遍历 KonvaCanvas 实例
            if (this.currentAnnotation) {
                this.enableEditor({
                    konvaStage,
                    pageNumber,
                    annotation: this.currentAnnotation // 启用特定类型的编辑器
                })
            }
        })
    }
    


    
    /**
     * 创建绘图容器 (painterWrapper)
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     * @returns 绘图容器元素
     */
    private createPainterWrapper(pageView: PDFPageView, pageNumber: number): HTMLDivElement {
        const wrapper = document.createElement('div') // 创建 div 元素作为绘图容器
        wrapper.id = `${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}` // 设置 id
        wrapper.classList.add(PAINTER_WRAPPER_PREFIX) // 添加类名
        pageView.div.appendChild(wrapper)
        return wrapper
    }

    /**
     * 创建 Konva Stage
     * @param container - 绘图容器元素
     * @param viewport - 当前 PDF 页面视口
     * @returns Konva Stage
     */
    private createKonvaStage(container: HTMLDivElement, viewport: PageViewport): Konva.Stage {
        const stage = new Konva.Stage({
            container,
            width: viewport.width,
            height: viewport.height,
            scale: { x: viewport.scale, y: viewport.scale }
        })

        const backgroundLayer = new Konva.Layer()
        stage.add(backgroundLayer)

        return stage
    }

    /**
     * 清理无效的 canvasStore
     */
    private cleanUpInvalidStore(): void {
        this.konvaCanvasStore.forEach(konvaCanvas => {
            if (!isElementInDOM(konvaCanvas.wrapper)) {
                konvaCanvas.konvaStage.destroy()
                this.konvaCanvasStore.delete(konvaCanvas.pageNumber)
            }
        })
    }
    /**
     * 插入新的绘图容器和 Konva Stage
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     */
    private insertCanvas(pageView: PDFPageView, pageNumber: number): void {
        this.cleanUpInvalidStore()
        const painterWrapper = this.createPainterWrapper(pageView, pageNumber)
        const konvaStage = this.createKonvaStage(painterWrapper, pageView.viewport)

        this.konvaCanvasStore.set(pageNumber, { pageNumber, konvaStage, wrapper: painterWrapper, isActive: false })
        this.reDrawAnnotation(pageNumber) // 重绘批注
        this.enablePainting() // 启用绘画
    }

    /**
     * 调整现有 KonvaCanvas 的缩放
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     */
    private scaleCanvas(pageView: PDFPageView, pageNumber: number): void {
        const konvaCanvas = this.konvaCanvasStore.get(pageNumber)
        if (!konvaCanvas) return

        const { konvaStage } = konvaCanvas
        const { scale, width, height } = pageView.viewport

        konvaStage.scale({ x: scale, y: scale })
        konvaStage.width(width)
        konvaStage.height(height)
    }


    public disable() {
        this.konvaMap.forEach((konvaStage, pageNumber) => {
            const wrapper = document.querySelector(`#${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}`) as HTMLDivElement
            if (wrapper) {
                wrapper.style.zIndex = '1'
                // Cleanup event listeners
                konvaStage.off('pointerdown')
                konvaStage.off('pointermove')
                konvaStage.off('pointerup')
            }
        })
    }

}