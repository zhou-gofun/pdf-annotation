import Konva from 'konva'

/**
 * FreeText 类用于在 Konva 舞台上添加自由文本
 */
export class FreeText {
    private textArea: HTMLTextAreaElement | null = null
    private konvaStage: Konva.Stage
    private color: string
    private onAdd: (textShape: Konva.Text) => void
    private onCancel: () => void

    constructor({
        konvaStage,
        inputPos,
        textPos,
        color,
        onAdd,
        onCancel
    }: {
        konvaStage: Konva.Stage
        inputPos: { x: number; y: number }
        textPos: { x: number; y: number }
        color: string
        onAdd: (textShape: Konva.Text) => void
        onCancel: () => void
    }) {
        this.onAdd = onAdd
        this.onCancel = onCancel
        this.color = color
        this.konvaStage = konvaStage
        this.setupInput({ textPos, inputPos })
    }

    private setupInput({ textPos, inputPos }: { 
        inputPos: { x: number; y: number }
        textPos: { x: number; y: number } 
    }) {
        this.textArea = document.createElement('textarea')
        this.textArea.rows = 1
        this.textArea.cols = 0
        this.textArea.classList.add('painter_input')
        this.textArea.placeholder = '开始输入...'
        this.textArea.style.cssText = `
            color: ${this.color};
            width: 200px;
            left: ${inputPos.x}px;
            top: ${inputPos.y}px;
            font-size: ${14 * this.konvaStage.scale().x}px;
        `

        this.konvaStage.container().parentElement?.prepend(this.textArea)
        
        setTimeout(() => {
            this.textArea?.focus()
        }, 300)

        // 使用箭头函数绑定 this
        this.textArea.addEventListener('input', this.handleInput)
        this.textArea.addEventListener('blur', () => this.handleBlur(textPos))
    }

    private handleInput = (event: Event) => {
        const element = event.target as HTMLTextAreaElement
        element.style.height = 'auto'
        const scrollHeight = element.scrollHeight
        element.style.height = `${scrollHeight}px`
    }

    private handleBlur = (textPos: { x: number; y: number }) => {
        this.createTextNode(textPos)
    }

    private createTextNode(pos: { x: number; y: number }) {
        if (!this.textArea) return
        
        const text = this.textArea.value.trim()
        const width = this.textArea.offsetWidth
        this.textArea.remove()
        this.textArea = null
        
        if (text !== '') {
            const textShape = new Konva.Text({
                x: pos.x,
                y: pos.y,
                text: text,
                width: width / this.konvaStage.scale().x,
                fontSize: 14,
                fill: this.color
            })
            this.onAdd(textShape)
        } else {
            this.onCancel()
        }
    }
}