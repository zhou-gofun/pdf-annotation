import type { PageViewport, PDFViewerApplication } from 'pdfjs'; // 导入 PageViewport 类型
 // 导入 PageViewport 类型
// import { PageViewport, PDFViewerApplication } from 'pdfjs-dist/web/pdf_viewer'
import './painter.scss'
import Konva from 'konva'
import { type IAnnotationType, Annotation } from '../const/definitions'
import { CURSOR_CSS_PROPERTY, PAINTER_IS_PAINTING_STYLE, PAINTER_PAINTING_TYPE, PAINTER_WRAPPER_PREFIX } from './const'
import { removeCssCustomProperty } from '../utils/utils'
import { ActionsValue, type ActionValueType } from '../actions/actions'
import { Stage } from 'konva/lib/Stage'
import { FreeText } from './freetext'
import type { KonvaEventObject } from 'konva/lib/Node';
import { ref } from 'vue'

// const PAINTER_WRAPPER_PREFIX = 'painter_wrapper'
const PDFJS_AnnotationEditorPrefix = 'pdfjs_internal_editor_'



// KonvaCanvas 接口定义
export interface KonvaCanvas {
    pageNumber: number
    konvaStage: Konva.Stage
    wrapper: HTMLDivElement
    isActive: boolean
}
export class Painter {
    private currentAnnotation: IAnnotationType | null = null // 当前批注类型
    private currentAction = ref<ActionValueType>(ActionsValue.None)
    private currentDrawGroup: Konva.Group | null = null
    private currentDrawShape: Konva.Shape | null = null
    private isPainting = false
    private konvaMap = new Map<number, Konva.Stage>()
    private annotationStoreMap = new Map<string, { pageNumber: number; json: string }>()
    private vertex = { x: 0, y: 0 }
    private PDFViewerApplication: PDFViewerApplication
    private tempDataTransfer: string | null | undefined // 临时数据传输
    // private konvaCanvasStore: Map<number, KonvaCanvas> = new Map() // 存储 KonvaCanvas 实例


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

        // this.enablePainting()
    }

    constructor() {
        this.PDFViewerApplication = (window as any).PDFViewerApplication
    }

    private createKonva({ container, viewport }: { container: HTMLDivElement; viewport: PageViewport }) {
        const konvaStage = new Konva.Stage({
            container,
            width: viewport.width,
            height: viewport.height,
            scale: {
                x: viewport.scale,
                y: viewport.scale
            }
        })

        const bgLayer = new Konva.Layer()
        konvaStage.add(bgLayer)
        return konvaStage
    }

    private drawJsonToKonva(pageNumber: number) {
        this.annotationStoreMap.forEach(annotation => {
            const konvaStage = this.konvaMap.get(pageNumber)
            if (annotation.pageNumber === pageNumber && konvaStage) {
                const newGroup = Konva.Node.create(annotation.json)
                newGroup.opacity(0)
                konvaStage.getLayers()[0].add(newGroup)
                
                new Konva.Tween({
                    node: newGroup,
                    opacity: 1,
                    duration: 0.3
                }).play()
            }
        })
    }

    private addEventListeners(konvaStage: Stage, pageNumber: number) {
        const pointerDown = (e: KonvaEventObject<PointerEvent>) => {
            if (e.evt.button === 0) this.pointerDownHandler(konvaStage, pageNumber, e)
        }
        
        const pointerMove = () => {
            if (this.isPainting) this.pointerMoveHandler(konvaStage, pageNumber)
        }
        
        const pointerUp = (e: KonvaEventObject<PointerEvent>) => {
            if (e.evt.button === 0) this.pointerUpHandler(konvaStage, pageNumber, e)
        }

        konvaStage.on('pointerdown', pointerDown)
        konvaStage.on('pointermove', pointerMove)
        konvaStage.on('pointerup', pointerUp)

        // Return cleanup function
        return () => {
            konvaStage.off('pointerdown', pointerDown)
            konvaStage.off('pointermove', pointerMove)
            konvaStage.off('pointerup', pointerUp)
        }
    }

    private pointerDownHandler(konvaStage: Stage, pageNumber: number, e: KonvaEventObject<PointerEvent>) {
        this.currentDrawShape = null
        this.isPainting = true
        
        this.currentDrawGroup = new Konva.Group({ draggable: false })
        konvaStage.getLayers()[0].add(this.currentDrawGroup)
        
        const pos = konvaStage.getRelativePointerPosition()
        // 确保pos不为null后再设置vertex
        if (pos) {
            this.vertex = { x: pos.x, y: pos.y }
        }

        switch (this.currentAction.value) {
            case ActionsValue.Ellipse:
                this.currentDrawShape = new Konva.Ellipse({
                    radiusX: 0,
                    radiusY: 0,
                    x: pos?.x ?? 0, // 当pos为null时使用默认值0
                    y: pos?.y ?? 0, // 当pos为null时使用默认值0
                    stroke: 'red',
                    strokeWidth: 4
                })
                this.currentDrawGroup.add(this.currentDrawShape)
                break

            case ActionsValue.Rect:
                this.currentDrawShape = new Konva.Rect({
                    x: pos?.x ?? 0, // 当pos为null时使用默认值0
                    y: pos?.y ?? 0, // 当pos为null时使用默认值0
                    width: 0,
                    height: 0,
                    stroke: 'green',
                    strokeWidth: 4
                })
                this.currentDrawGroup.add(this.currentDrawShape)
                break

            case ActionsValue.Text:
                new FreeText({
                    konvaStage,
                    textPos: pos ?? { x: 0, y: 0 }, // 当pos为null时使用默认值0
                    inputPos: { x: e.evt.offsetX, y: e.evt.offsetY },
                    color: 'blue',
                    onAdd: textShape => {
                        this.currentDrawGroup?.add(textShape)
                        this.drawDone(konvaStage, pageNumber)
                    },
                    onCancel: () => {
                        this.resetDrawingState()
                    }
                })
                this.disable()
                break
        }
    }

    private pointerMoveHandler(konvaStage: Stage, _pageNumber: number) {
        if (!this.isPainting || !this.currentDrawShape) return
        
        const pos = konvaStage.getRelativePointerPosition()
        const radiusX = Math.abs((pos?.x ?? 0) - this.vertex.x) / 2
        const radiusY = Math.abs((pos?.y ?? 0) - this.vertex.y) / 2

        if (this.currentAction.value === ActionsValue.Ellipse && this.currentDrawShape instanceof Konva.Ellipse) {
            this.currentDrawShape.setAttrs({
                x: ((pos?.x ?? 0) - this.vertex.x) / 2 + this.vertex.x,
                y: ((pos?.y ?? 0) - this.vertex.y) / 2 + this.vertex.y,
                radiusX,
                radiusY
            })
        }

        if (this.currentAction.value === ActionsValue.Rect && this.currentDrawShape instanceof Konva.Rect) {
            this.currentDrawShape.setAttrs({
                x: Math.min(this.vertex.x, (pos?.x ?? 0)),
                y: Math.min(this.vertex.y, (pos?.y ?? 0)),
                width: Math.abs((pos?.x ?? 0) - this.vertex.x),
                height: Math.abs((pos?.y ?? 0) - this.vertex.y)
            })
        }
    }

    private pointerUpHandler(konvaStage: Stage, pageNumber: number, e: KonvaEventObject<PointerEvent>) {
        if (!this.isPainting) return
        
        const currentAction = this.currentAction.value
        this.drawDone(konvaStage, pageNumber)

        // 绘制圆形和矩形时主动插入text input
        if ((currentAction === ActionsValue.Ellipse || currentAction === ActionsValue.Rect) && this.currentDrawGroup) {
            new FreeText({
                konvaStage,
                textPos: konvaStage.getRelativePointerPosition() ?? { x: 0, y: 0 }, // 当pos为null时使用默认值0
                inputPos: { x: e.evt.offsetX, y: e.evt.offsetY },
                color: 'blue',
                onAdd: textShape => {
                    this.currentAction.value = ActionsValue.Text
                    this.currentDrawGroup = new Konva.Group({ draggable: false })
                    konvaStage.getLayers()[0].add(this.currentDrawGroup)
                    this.currentDrawGroup.add(textShape)
                    this.drawDone(konvaStage, pageNumber)
                    this.currentAction.value = currentAction
                },
                onCancel: () => {
                    this.resetDrawingState()
                }
            })
        }
    }

    private drawDone(konvaStage: Stage, pageNumber: number) {
        if (this.currentDrawGroup) {
            this.saveAnnotationStore(this.currentDrawGroup, konvaStage, pageNumber)
        }
        this.resetDrawingState()
    }

    private resetDrawingState() {
        this.currentDrawShape = null
        this.currentDrawGroup = null
        this.isPainting = false
    }
/**
     * 启用特定类型的编辑器
     * @param options - 包含 Konva Stage、页码和批注类型的对象
     */
    // private enableEditor({ konvaStage, pageNumber, annotation }: { konvaStage: Konva.Stage; pageNumber: number; annotation: IAnnotationType }): void {
    //     const storeEditor = this.findEditor(pageNumber, annotation.type) // 查找存储中的编辑器实例
    //     if (storeEditor) {
    //         if (storeEditor instanceof EditorSignature) {
    //             storeEditor.activateWithSignature(konvaStage, annotation, this.tempDataTransfer) // 激活带有签名的编辑器
    //             return
    //         }
    //         if (storeEditor instanceof EditorStamp) {
    //             storeEditor.activateWithStamp(konvaStage, annotation, this.tempDataTransfer) // 激活带有图章的编辑器
    //             return
    //         }
    //         storeEditor.activate(konvaStage, annotation) // 激活编辑器
    //         return
    //     }
    //     let editor: Editor | null = null // 初始化编辑器为空
    //     switch (annotation.type) {
    //         case AnnotationType.FREETEXT:
    //             editor = new EditorFreeText({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.RECTANGLE:
    //             editor = new EditorRectangle({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.ARROW:
    //             editor = new EditorArrow({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.CLOUD:
    //             editor = new EditorCloud({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.CIRCLE:
    //             editor = new EditorCircle({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.NOTE:
    //             editor = new EditorNote({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: () => {}
    //             })
    //             break
    //         case AnnotationType.FREEHAND:
    //             editor = new EditorFreeHand({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.FREE_HIGHLIGHT:
    //             editor = new EditorFreeHighlight({
    //                 userName: this.userName,
    //                 pdfViewerApplication: this.pdfViewerApplication,
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation,
    //                 onAdd: annotationStore => {
    //                     this.saveToStore(annotationStore)
    //                 },
    //                 onChange: (id, updates) => {
    //                     this.updateStore(id, updates) // 更新存储
    //                 }
    //             })
    //             break
    //         case AnnotationType.SIGNATURE:
    //             editor = new EditorSignature(
    //                 {
    //                     userName: this.userName,
    //                     pdfViewerApplication: this.pdfViewerApplication,
    //                     konvaStage,
    //                     pageNumber,
    //                     annotation,
    //                     onAdd: annotationStore => {
    //                         this.saveToStore(annotationStore)
    //                     },
    //                     onChange: () => {}
    //                 },
    //                 this.tempDataTransfer
    //             )
    //             break
    //         case AnnotationType.STAMP:
    //             editor = new EditorStamp(
    //                 {
    //                     userName: this.userName,
    //                     pdfViewerApplication: this.pdfViewerApplication,
    //                     konvaStage,
    //                     pageNumber,
    //                     annotation,
    //                     onAdd: annotationStore => {
    //                         this.saveToStore(annotationStore)
    //                     },
    //                     onChange: () => {}
    //                 },
    //                 this.tempDataTransfer
    //             )
    //             break
    //         case AnnotationType.HIGHLIGHT:
    //         case AnnotationType.UNDERLINE:
    //         case AnnotationType.STRIKEOUT:
    //             editor = new EditorHighLight(
    //                 {
    //                     userName: this.userName,
    //                     pdfViewerApplication: this.pdfViewerApplication,
    //                     konvaStage,
    //                     pageNumber,
    //                     annotation,
    //                     onAdd: annotationStore => {
    //                         this.saveToStore(annotationStore)
    //                     },
    //                     onChange: (id, updates) => {
    //                         this.updateStore(id, updates) // 更新存储
    //                     }
    //                 },
    //                 annotation.type
    //             )
    //             break
    //         case AnnotationType.SELECT:
    //             this.selector.activate(pageNumber) // 激活选择器
    //             break

    //         default:
    //             console.warn(`未实现的批注类型: ${annotation.type}`)
    //             return
    //     }

    //     if (editor) {
    //         this.editorStore.set(editor.id, editor) // 将编辑器实例存储到 editorStore
    //     }
    // }
    /**
     * 启用绘画
     */
    // private enablePainting(): void {
    //     this.konvaCanvasStore.forEach(({ konvaStage, pageNumber }) => {
    //         // 遍历 KonvaCanvas 实例
    //         if (this.currentAnnotation) {
    //             this.enableEditor({
    //                 konvaStage,
    //                 pageNumber,
    //                 annotation: this.currentAnnotation // 启用特定类型的编辑器
    //             })
    //         }
    //     })
    // }
    private saveAnnotationStore(drawGroup: Konva.Group, konvaStage: Stage, pageNumber: number) {
        const annotationStorageJson = drawGroup.toJSON()
        const annotationStorageId = `${PDFJS_AnnotationEditorPrefix}${this.annotationStoreMap.size}`
        const { width, height } = konvaStage.size()
        const { x: scaleX, y: scaleY } = konvaStage.scale()
        const pageWidth = width / scaleX
        const pageHeight = height / scaleY

        this.annotationStoreMap.set(annotationStorageId, { pageNumber, json: annotationStorageJson })

        const shape = drawGroup.findOne((node: Konva.Node) => node.getType() === 'Shape')
        if (!shape) return

        const { attrs } = shape.toObject()

        switch (this.currentAction.value) {
            case ActionsValue.Rect: {
                const { path, rect } = this.calculateRectPath(attrs.x ?? 0, attrs.y ?? 0, attrs.width ?? 0, attrs.height ?? 0, pageWidth, pageHeight)
                this.saveRectAnnotation(annotationStorageId, pageNumber, path, rect)
                break
            }
            case ActionsValue.Ellipse: {
                const { path, rect } = this.calculateEllipsePath(attrs.x ?? 0, attrs.y ?? 0, attrs.radiusX ?? 0, attrs.radiusY ?? 0, pageWidth, pageHeight)
                this.saveEllipseAnnotation(annotationStorageId, pageNumber, path, rect)
                break
            }
            case ActionsValue.Highlight: {
                this.saveHighlightAnnotations(drawGroup, annotationStorageId, pageNumber, pageWidth, pageHeight)
                break
            }
            case ActionsValue.Text: {
                const height = shape.height() + 10
                const { rect } = this.calculateFreeTextRect(attrs.x ?? 0, attrs.y ?? 0, attrs.width ?? 0, height, pageWidth, pageHeight)
                this.saveTextAnnotation(annotationStorageId, pageNumber, rect, attrs.text)
                break
            }
        }
    }

    private saveRectAnnotation(id: string, pageNumber: number, path: number[], rect: number[]) {
        this.PDFViewerApplication.pdfDocument.annotationStorage.setValue(id, {
            annotationType: 15,
            color: [0, 128, 0],
            thickness: 4,
            opacity: 1,
            paths: [{ bezier: path, points: path }],
            pageIndex: pageNumber - 1,
            rect,
            rotation: 0
        })
    }

    private saveEllipseAnnotation(id: string, pageNumber: number, path: number[], rect: number[]) {
        this.PDFViewerApplication.pdfDocument.annotationStorage.setValue(id, {
            annotationType: 15,
            color: [255, 0, 0],
            thickness: 4,
            opacity: 1,
            paths: [{ bezier: path, points: path }],
            pageIndex: pageNumber - 1,
            rect,
            rotation: 0
        })
    }

    private saveHighlightAnnotations(group: Konva.Group, baseId: string, pageNumber: number, pageWidth: number, pageHeight: number) {
        const allHighlight = group.getChildren(node => node.getType() === 'Shape')
        allHighlight.forEach((shape, index) => {
            const { attrs } = shape
            const { outlines, rect } = this.calculateHighlightPath(attrs.x, attrs.y, attrs.width, attrs.height, pageWidth, pageHeight)
            this.PDFViewerApplication.pdfDocument.annotationStorage.setValue(`${baseId}_${index}`, {
                annotationType: 9,
                color: [255, 255, 0],
                opacity: 0.6,
                quadPoints: outlines,
                outlines: [outlines],
                rect,
                pageIndex: pageNumber - 1,
                rotation: 0
            })
        })
    }

    private saveTextAnnotation(id: string, pageNumber: number, rect: number[], text: string) {
        this.PDFViewerApplication.pdfDocument.annotationStorage.setValue(id, {
            annotationType: 3,
            fontSize: 14,
            color: [0, 0, 255],
            rect,
            pageIndex: pageNumber - 1,
            rotation: 0,
            value: text
        })
    }

    private calculateFreeTextRect(x: number, y: number, width: number, height: number, _canvasWidth: number, canvasHeight: number) {
        const topRightX = x + width
        const topRightY = y
        const bottomRightY = y + height
        const rect = [x, canvasHeight - bottomRightY, topRightX, canvasHeight - topRightY]
        return { rect }
    }

    private calculateHighlightPath(x: number, y: number, width: number, height: number, _canvasWidth: number, canvasHeight: number) {
        const topRightX = x + width
        const bottomRightY = y + height
        const rect = [x, canvasHeight - bottomRightY, topRightX, canvasHeight - y]
        const outlines = [x, canvasHeight - y, x, canvasHeight - bottomRightY, topRightX, canvasHeight - bottomRightY, topRightX, canvasHeight - y]
        return { outlines, rect }
    }

    private calculateRectPath(x: number, y: number, width: number, height: number, _canvasWidth: number, canvasHeight: number) {
        const halfInterval = 0.5
        const points: number[] = []
        const rectBottomRightX = x + width
        const rectBottomRightY = y + height
        const rect = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY]

        // 添加左边缘上的点
        for (let i = y; i < rectBottomRightY; i += halfInterval) {
            points.push(x, canvasHeight - i)
        }

        // 添加底边缘上的点
        for (let i = x + halfInterval; i < rectBottomRightX; i += halfInterval) {
            points.push(i, canvasHeight - rectBottomRightY)
        }

        // 添加右边缘上的点
        for (let i = rectBottomRightY - halfInterval; i >= y; i -= halfInterval) {
            points.push(rectBottomRightX, canvasHeight - i)
        }

        // 添加顶边缘上的点
        for (let i = rectBottomRightX - halfInterval; i >= x + halfInterval; i -= halfInterval) {
            points.push(i, canvasHeight - y)
        }

        return { path: points, rect }
    }

    private calculateEllipsePath(x: number, y: number, radiusX: number, radiusY: number, _canvasWidth: number, canvasHeight: number) {
        const halfInterval = 0.5
        const points: number[] = []

        for (let angle = 0; angle <= 360; angle += halfInterval) {
            const radians = (angle * Math.PI) / 180
            const pointX = x + radiusX * Math.cos(radians)
            const pointY = y + radiusY * Math.sin(radians)
            points.push(pointX, canvasHeight - pointY)
        }

        const rect = [x - radiusX * 2, canvasHeight - (y + radiusY * 2), x + radiusX * 2, canvasHeight - (y - radiusY * 2)]
        return { path: points, rect }
    }

    public insertCanvas({ pageDiv, viewport, pageNumber }: { pageDiv: HTMLDivElement; viewport: PageViewport; pageNumber: number }) {
        const painterWrapper = document.createElement('div')
        const { style } = painterWrapper

        style.width = `calc(var(--scale-factor) * ${viewport.viewBox[2]}px)`
        style.height = `calc(var(--scale-factor) * ${viewport.viewBox[3]}px)`
        painterWrapper.id = `${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}`
        painterWrapper.classList.add(PAINTER_WRAPPER_PREFIX)

        pageDiv.append(painterWrapper)
        const konvaStage = this.createKonva({ container: painterWrapper, viewport })
        this.konvaMap.set(pageNumber, konvaStage)
        this.drawJsonToKonva(pageNumber)
    }

    public scaleCanvas({ viewport, pageNumber }: { viewport: PageViewport; pageNumber: number }) {
        const konvaStage = this.konvaMap.get(pageNumber)
        if (konvaStage) {
            konvaStage.scale({ x: viewport.scale, y: viewport.scale })
            konvaStage.width(viewport.width)
            konvaStage.height(viewport.height)
        }
    }

    public enable(actionsValue: ActionValueType) {
        this.currentAction.value = actionsValue
        this.konvaMap.forEach((konvaStage, pageNumber) => {
            const wrapper = document.querySelector(`#${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}`) as HTMLDivElement
            if (wrapper) {
                wrapper.style.zIndex = '999'
                this.addEventListeners(konvaStage, pageNumber)
            }
        })
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

    public drawWebSelectionToKonva(pageNumber: number, actionsValue: ActionValueType, elements: HTMLElement[]) {
        const konvaStage = this.konvaMap.get(pageNumber)
        const wrapper = document.querySelector(`#${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}`) as HTMLDivElement
        
        if (!konvaStage || !wrapper) return

        this.currentDrawGroup = new Konva.Group({ draggable: false })
        this.currentAction.value = actionsValue
        konvaStage.getLayers()[0].add(this.currentDrawGroup)

        elements.forEach(spanEl => {
            const bounding = spanEl.getBoundingClientRect()
            const fixBounding = wrapper.getBoundingClientRect()
            const scale = konvaStage.scale()
            
            const x0 = (bounding.x - fixBounding.x) / scale.x
            const y0 = (bounding.y - fixBounding.y) / scale.y
            const x1 = bounding.width / scale.x
            const y1 = bounding.height / scale.y

            let shape: Konva.Shape | null = null

            switch (actionsValue) {
                case ActionsValue.Highlight:
                    shape = new Konva.Rect({
                        x: x0,
                        y: y0,
                        width: x1,
                        height: y1,
                        opacity: 0.6,
                        fill: 'yellow'
                    })
                    break
                    
                case ActionsValue.Underline:
                    shape = new Konva.Line({
                        points: [x0, y0 + y1, x0 + x1, y0 + y1],
                        stroke: 'blue',
                        hitStrokeWidth: 20,
                        strokeWidth: 2
                    })
                    break
                    
                case ActionsValue.Strikeout:
                    shape = new Konva.Line({
                        points: [x0, y0 + y1 / 2, x0 + x1, y0 + y1 / 2],
                        stroke: 'red',
                        hitStrokeWidth: 20,
                        strokeWidth: 2
                    })
                    break
            }

            if (shape) {
                this.currentDrawGroup?.add(shape)
            }
        })

        if (this.currentDrawGroup) {
            this.saveAnnotationStore(this.currentDrawGroup, konvaStage, pageNumber)
        }
        this.currentDrawGroup = null
    }
}