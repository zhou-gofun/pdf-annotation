import Konva from 'konva'
// import { type KonvaEventObject } from 'konva/lib/Node'

import type { IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Annotation } from '../../const/definitions'
import { Editor, type IEditorOptions } from './editor'

/**
 * EditorHighLight 是继承自 Editor 的高亮编辑器类。
 */
export class EditorHighLight extends Editor {
    /**
     * 创建一个 EditorHighLight 实例。
     * @param EditorOptions 初始化编辑器的选项
     * @param _editorType 注释类型
     */
    // constructor(EditorOptions: IEditorOptions, editorType: AnnotationType) {
    //     super({ ...EditorOptions, editorType })
    // }
    constructor(EditorOptions: IEditorOptions, editorType: number) {
        super({ ...EditorOptions, editorType })
    }

    /**
     * 将网页上选中文字区域转换为图形并绘制在 Canvas 上。
     * @param elements HTMLSpanElement 数组，表示要绘制的元素
     * @param fixElement 用于修正计算的元素
     */
    public convertTextSelection(elements: HTMLSpanElement[], fixElement: HTMLDivElement) {
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        // 获取基准元素的边界矩形，用于计算相对坐标
        const fixBounding = fixElement.getBoundingClientRect()

        // 合并相邻的空元素与非空元素，确保连续性
        const mergedBounds = this.mergeAdjacentElements(elements)
        console.log('mergedBounds：', mergedBounds)

        mergedBounds.forEach(adjustedBounding => {
            const { x, y, width, height } = this.calculateRelativePosition(adjustedBounding, fixBounding)
            const shape = this.createShape(x, y, width, height)
            this.currentShapeGroup?.konvaGroup.add(shape)
        })

        this.setShapeGroupDone({
            id: this.currentShapeGroup.id,
            contentsObj: {
                text: this.getElementOuterText(elements)
            },
            color: this.currentAnnotation?.style?.color
        })
    }

    /**
     * 获取所有 elements 内部文字。
     * @param elements HTMLSpanElement 数组
     * @returns 所有元素内部文字的字符串
     */
    private getElementOuterText(elements: HTMLSpanElement[]): string {
        return elements.map(el => el.outerText).join('')
    }

    /**
     * 合并相邻的元素以确保连续性
     * 将空格或空内容元素与后面第一个非空元素合并
     * @param elements HTMLSpanElement 数组
     * @returns 合并后的边界矩形数组
     */
    private mergeAdjacentElements(elements: HTMLSpanElement[]): { x: number, y: number, width: number, height: number }[] {
        if (elements.length === 0) {
            return []
        }

        const mergedBounds: { x: number, y: number, width: number, height: number }[] = []
        let i = 0

        while (i < elements.length) {
            const currentElement = elements[i]
            const currentBounding = currentElement.getBoundingClientRect()
            const currentText = currentElement.textContent?.trim() || ''

            // 如果当前元素是空的或只包含空格
            if (currentText === '' || currentText === ' ') {
                // 寻找后面第一个非空元素
                let j = i + 1
                let nonEmptyFound = false
                let combinedBounding = {
                    x: currentBounding.x,
                    y: currentBounding.y,
                    width: currentBounding.width,
                    height: currentBounding.height
                }

                while (j < elements.length) {
                    const nextElement = elements[j]
                    const nextBounding = nextElement.getBoundingClientRect()
                    const nextText = nextElement.textContent?.trim() || ''

                    // 扩展合并区域
                    combinedBounding = {
                        x: Math.min(combinedBounding.x, nextBounding.x),
                        y: Math.min(combinedBounding.y, nextBounding.y),
                        width: Math.max(combinedBounding.x + combinedBounding.width, nextBounding.x + nextBounding.width) - Math.min(combinedBounding.x, nextBounding.x),
                        height: Math.max(combinedBounding.y + combinedBounding.height, nextBounding.y + nextBounding.height) - Math.min(combinedBounding.y, nextBounding.y)
                    }

                    if (nextText !== '' && nextText !== ' ') {
                        // 找到非空元素，停止合并
                        nonEmptyFound = true
                        break
                    }
                    j++
                }

                mergedBounds.push(combinedBounding)
                i = nonEmptyFound ? j + 1 : elements.length // 跳过已处理的元素
            } else {
                // 非空元素直接添加
                mergedBounds.push({
                    x: currentBounding.x,
                    y: currentBounding.y,
                    width: currentBounding.width,
                    height: currentBounding.height
                })
                i++
            }
        }

        return mergedBounds
    }

    /**
     * 计算元素的相对位置和尺寸，适配 Canvas 坐标系。
     * @param elementBounding 元素的边界矩形或自定义边界对象
     * @param fixBounding 基准元素的边界矩形
     * @returns 相对位置和尺寸的对象 { x, y, width, height }
     */
    private calculateRelativePosition(elementBounding: DOMRect | { x: number, y: number, width: number, height: number }, fixBounding: DOMRect) {
        const scale = this.konvaStage.scale()
        const x = (elementBounding.x - fixBounding.x) / scale.x
        const y = (elementBounding.y - fixBounding.y + elementBounding.height/12) / scale.y
        const width = (elementBounding.width) / scale.x
        const height = (elementBounding.height / scale.y) * 0.92
        return { x, y, width, height }
    }

    /**
     * 根据当前的注释类型创建对应的形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Shape 具体类型的形状
     */
    private createShape(x: number, y: number, width: number, height: number): Konva.Shape {
        switch (this.currentAnnotation?.type) {
            case Annotation.HIGHLIGHT:
                return this.createHighlightShape(x, y, width, height)
            case Annotation.UNDERLINE:
                return this.createUnderlineShape(x, y, width, height)
            case Annotation.STRIKEOUT:
                return this.createStrikeoutShape(x, y, width, height)
            case Annotation.SQUIGGLY:
                return this.createSquigglyShape(x, y, width, height)
            default:
                throw new Error(`Unsupported annotation type: ${this.currentAnnotation?.type}`)
        }
    }

    /**
     * 创建波浪线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Line 波浪线形状对象
     */
    private createSquigglyShape(x: number, y: number, width: number, height: number): Konva.Line {
        // 创建波浪线路径
        const points: number[] = []
        
        // 使用strokeWidth来调节波浪幅度，如果没有设置strokeWidth则使用默认值
        const strokeWidth = this.currentAnnotation?.style?.strokeWidth || 1
        const amplitude = (height * 0.2) * strokeWidth // 波浪幅度根据strokeWidth调整
        const frequency = 4 // 波浪频率，在给定宽度内的波浪数量
        const baseY = y + height + 1 // 基准Y坐标，放在文本下方
        
        // 生成波浪线的点
        const steps = Math.max(width / 2, 20) // 确保有足够的点来形成平滑的波浪
        for (let i = 0; i <= steps; i++) {
            const currentX = x + (width * i) / steps
            const waveY = baseY + Math.sin((i / steps) * frequency * Math.PI * 2) * amplitude
            points.push(currentX, waveY)
        }
        
        return new Konva.Line({
            points,
            stroke: this.currentAnnotation?.style?.color,
            // strokeWidth: Math.max(strokeWidth * 0.5, 0.3), // 线条宽度也根据strokeWidth调整
            strokeWidth: this.currentAnnotation?.style?.strokeWidth || 1, // 线条宽度也根据strokeWidth调整
            hitStrokeWidth: 8,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: this.currentAnnotation?.style?.opacity || 1,
        })
    }

    /**
     * 创建高亮形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 高亮形状对象
     */
    private createHighlightShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y,
            width,
            height,
            opacity: this.currentAnnotation?.style?.opacity || 0.5,
            fill: this.currentAnnotation?.style?.color
        })
    }

    /**
     * 创建下划线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 下划线形状对象
     */
    private createUnderlineShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y: height + y,
            width,
            stroke: this.currentAnnotation?.style?.color,
            opacity: this.currentAnnotation?.style?.opacity || 1,
            strokeWidth: this.currentAnnotation?.style?.strokeWidth || 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    /**
     * 创建删除线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 删除线形状对象
     */
    private createStrikeoutShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y: y + height / 2,
            width,
            stroke: this.currentAnnotation?.style?.color,
            opacity: this.currentAnnotation?.style?.opacity || 1,
            strokeWidth: this.currentAnnotation?.style?.strokeWidth || 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    /**
     * 处理鼠标按下事件，目前未实现具体逻辑。
     */
    protected mouseDownHandler() {}

    /**
     * 处理鼠标移动事件，目前未实现具体逻辑。
     */
    protected mouseMoveHandler() {}

    /**
     * 处理鼠标抬起事件，目前未实现具体逻辑。
     */
    protected mouseUpHandler() {}

    /**
     * @description 更改注释样式
     * @param annotationStore
     * @param styles
     */
    protected changeStyle(annotationStore: IAnnotationStore, styles: IAnnotationStyle): void {
        const id = annotationStore.id
        const group = this.getShapeGroupById(id)
        if (group) {
            group.getChildren().forEach(shape => {
                if (annotationStore.type === Annotation.HIGHLIGHT) {
                    if (shape instanceof Konva.Rect) {
                        if (styles.color !== undefined) {
                            shape.fill(styles.color)
                        }
                        if (styles.strokeWidth !== undefined) {
                            shape.strokeWidth(styles.strokeWidth)
                        }
                        if (styles.opacity !== undefined) {
                            shape.opacity(styles.opacity)
                        }
                    }
                }
                if (annotationStore.type === Annotation.UNDERLINE) {
                    if (shape instanceof Konva.Rect) {
                        if (styles.color !== undefined) {
                            shape.stroke(styles.color)
                        }
                        if (styles.strokeWidth !== undefined) {
                            shape.strokeWidth(styles.strokeWidth)
                        }
                        if (styles.opacity !== undefined) {
                            shape.opacity(styles.opacity)
                        }
                    }
                }
                if (annotationStore.type === Annotation.STRIKEOUT) {
                    if (shape instanceof Konva.Rect) {
                        if (styles.color !== undefined) {
                            shape.stroke(styles.color)
                        }
                        if (styles.strokeWidth !== undefined) {
                            shape.strokeWidth(styles.strokeWidth)
                        }
                        if (styles.opacity !== undefined) {
                            shape.opacity(styles.opacity)
                        }
                    }
                }
                if (annotationStore.type === Annotation.SQUIGGLY) {
                    if (shape instanceof Konva.Line) {
                        if (styles.color !== undefined) {
                            shape.stroke(styles.color)
                        }
                        if (styles.strokeWidth !== undefined) {
                            shape.strokeWidth(styles.strokeWidth)
                        }
                        if (styles.opacity !== undefined) {
                            shape.opacity(styles.opacity)
                        }
                    }
                }
            })
            const changedPayload: { konvaString: string; color?: string } = {
                konvaString: group.toJSON()
            }

            if (styles.color !== undefined) {
                changedPayload.color = styles.color
            }

            this.setChanged(id, changedPayload)
        }
    }
}
