import Konva from 'konva'
import { type KonvaEventObject } from 'konva/lib/Node'

import type { IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Annotation } from '../../const/definitions'
import { Editor, type IEditorOptions } from './editor'

/**
 * 橡皮擦编辑器类，继承自基础编辑器类 Editor，用于在画布上删除其他注释。
 */
export class EditorEraser extends Editor {
    private eraserPath: Konva.Line | null // 当前橡皮擦轨迹（仅用于显示，不保存）
    private erasedAnnotations: Set<string> = new Set() // 已删除的注释ID集合

    /**
     * 构造函数，初始化橡皮擦编辑器。
     * @param EditorOptions 编辑器选项接口
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: Annotation.ERASER })
        this.eraserPath = null
    }

    /**
     * 处理鼠标或触摸指针按下事件，开始橡皮擦操作。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }

        Editor.TimerClear(this.pageNumber)
        this.eraserPath = null
        this.isPainting = true
        this.erasedAnnotations.clear() // 清空已删除列表

        // 获取当前指针位置，创建橡皮擦轨迹（仅用于显示）
        const pos = this.konvaStage.getRelativePointerPosition()
        if (pos) {
            this.eraserPath = new Konva.Line({
                strokeScaleEnabled: false,
                stroke: '#ff0000',
                strokeWidth: 2,
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round',
                visible: true,
                points: [pos.x, pos.y, pos.x, pos.y]
            })

            // 临时添加到背景层显示橡皮擦轨迹
            this.getBgLayer().add(this.eraserPath)
        }

        window.addEventListener('mouseup', this.globalPointerUpHandler)
    }

    /**
     * 处理鼠标或触摸指针移动事件，执行橡皮擦操作。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) {
            return
        }

        e.evt.preventDefault()

        const pos = this.konvaStage.getRelativePointerPosition()
        if (!pos || !this.eraserPath) return

        // 更新橡皮擦轨迹显示
        const newPoints = this.eraserPath.points().concat([pos.x, pos.y])
        this.eraserPath.points(newPoints)

        // 执行碰撞检测和删除操作
        this.performErase(pos)
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成橡皮擦操作。
     */
    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }

        this.isPainting = false

        // 移除临时的橡皮擦轨迹显示
        if (this.eraserPath) {
            this.eraserPath.destroy()
            this.eraserPath = null
        }

        // 如果有删除操作，记录删除事件
        if (this.erasedAnnotations.size > 0) {
            this.recordEraseOperation()
        }

        window.removeEventListener('mouseup', this.globalPointerUpHandler)
    }

    /**
     * 执行橡皮擦操作，检测并隐藏碰撞的注释
     * @param pos 当前鼠标位置
     */
    private performErase(pos: { x: number, y: number }) {
        const eraserRadius = 10 // 橡皮擦有效半径

        // 获取背景层中的所有形状组
        const bgLayer = this.getBgLayer()
        const shapeGroups = bgLayer.getChildren()

        for (const group of shapeGroups) {
            if (!(group instanceof Konva.Group) || this.erasedAnnotations.has(group.id())) {
                continue // 跳过已删除的或非Group对象
            }

            // 检查组内所有形状是否与橡皮擦碰撞
            const shapes = group.getChildren()
            let hasCollision = false

            for (const shape of shapes) {
                if (this.isShapeColliding(shape, pos, eraserRadius)) {
                    hasCollision = true
                    break
                }
            }

            if (hasCollision) {
                // 隐藏整个注释组
                group.visible(false)
                this.erasedAnnotations.add(group.id())
                
                // 调用删除回调，让外部知道该注释被删除
                if (this.onDelete) {
                    this.onDelete(group.id())
                }
            }
        }
    }

    /**
     * 检测形状是否与橡皮擦碰撞
     * @param shape Konva形状对象
     * @param pos 橡皮擦位置
     * @param radius 橡皮擦半径
     * @returns 是否碰撞
     */
    private isShapeColliding(shape: Konva.Node, pos: { x: number, y: number }, radius: number): boolean {
        try {
            // 获取形状的客户端区域边界
            const bounds = shape.getClientRect()
            
            // 计算橡皮擦中心到矩形边界的最短距离
            const closestX = Math.max(bounds.x, Math.min(pos.x, bounds.x + bounds.width))
            const closestY = Math.max(bounds.y, Math.min(pos.y, bounds.y + bounds.height))
            
            const distanceX = pos.x - closestX
            const distanceY = pos.y - closestY
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
            
            return distance <= radius
        } catch (error) {
            console.warn('Shape collision detection failed:', error)
            return false
        }
    }

    /**
     * 记录橡皮擦操作（可选：用于撤销/重做功能）
     */
    private recordEraseOperation() {
        // 这里可以实现撤销/重做的逻辑
        // 例如记录被删除的注释ID列表
        console.log('Erased annotations:', Array.from(this.erasedAnnotations))
    }

    /**
     * 删除回调函数（由外部设置）
     */
    private onDelete?: (annotationId: string) => void

    /**
     * 设置删除回调函数
     * @param callback 删除回调函数
     */
    public setDeleteCallback(callback: (annotationId: string) => void) {
        this.onDelete = callback
    }

    /**
     * 全局鼠标释放事件处理器，仅处理左键释放事件。
     * @param e MouseEvent 对象
     */
    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // 只处理左键释放事件
        this.mouseUpHandler() // 调用指针释放处理方法
        window.removeEventListener('mouseup', this.globalPointerUpHandler) // 移除全局鼠标释放事件监听器
    }

    /**
     * 处理样式更改（橡皮擦不需要样式更改）
     */
    protected changeStyle(_annotationStore: IAnnotationStore, _styles: IAnnotationStyle): void {
        // 橡皮擦不需要样式更改
    }
}