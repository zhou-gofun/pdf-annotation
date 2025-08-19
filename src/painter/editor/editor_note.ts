
import { createDocumentIcon } from '../../utils/documentIcon'
import { type KonvaEventObject } from 'konva/lib/Node'

import { Annotation } from '../../const/definitions'
import { Editor, type IEditorOptions } from './editor'

export class EditorNote extends Editor {
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: Annotation.NOTE })
    }

    protected mouseDownHandler() {}
    protected mouseMoveHandler() {}

    protected async mouseUpHandler(e: KonvaEventObject<PointerEvent>) {
        const color = 'rgb(255, 222, 33)'
        const pos = this.konvaStage.getRelativePointerPosition()
        if (!pos) return // 或者处理空值情况

        const { x, y } = pos
        // 然后使用 x 和 y
        
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const docIcon = createDocumentIcon({ x, y, fill: color })

        this.currentShapeGroup.konvaGroup.add(...docIcon)
        const id = this.currentShapeGroup.konvaGroup.id()
        this.setShapeGroupDone({
            id,
            contentsObj: {
                text: ''
            },
            color
        })
    }

    protected changeStyle(): void {}
}
