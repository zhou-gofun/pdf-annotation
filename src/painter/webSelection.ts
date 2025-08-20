
import Highlighter from 'web-highlighter'

export class WebSelection {
    isEditing = false
    onSelect: (range: Range | null) => void
    onHighlight: (selection: Partial<Record<number, any[]>>) => void
    highlighterObj: Highlighter | null = null

    private isSelecting = false

    constructor({
        onSelect,
        onHighlight
    }: {
        onSelect: (range: Range | null) => void
        onHighlight: (selection: Partial<Record<number, any[]>>) => void
    }) {
        this.onSelect = onSelect
        this.onHighlight = onHighlight
    }

    create(root: HTMLElement) {
        this.highlighterObj = new Highlighter({
            $root: root,
            wrapTag: 'mark'
        })
        this.highlighterObj.stop()

        const handleSelectionChange = () => {
            const selection = window.getSelection()
            if (!selection || selection.type === 'Caret') {
                this.onSelect(null)
                return
            }
            const range = selection.getRangeAt(0)
            if (root.contains(range.commonAncestorContainer)) {
                this.isSelecting = true
            }
        }

        const handleMouseUp = () => {
            if (!this.isSelecting) return
            this.isSelecting = false
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                this.onSelect(selection.getRangeAt(0))
            }
        }

        const handleTouchEnd = () => {
            if (!this.isSelecting) return
            this.isSelecting = false
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
                this.onSelect(selection.getRangeAt(0))
            }
        }

        document.addEventListener('selectionchange', handleSelectionChange)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchend', handleTouchEnd)

        this.highlighterObj.on('selection:create', data => {
            const allSourcesSpan: HTMLElement[] = []
            data.sources.forEach(item => {
                allSourcesSpan.push(...(this.highlighterObj?.getDoms(item.id) ?? []))
            })

            // 手动 groupBy
            const pageSelection = allSourcesSpan.reduce((acc: Partial<Record<number, any[]>>, span) => {
                const pageNum = span.closest('.page')?.getAttribute('data-page-number')
                if (pageNum) {
                    acc[Number(pageNum)] = acc[Number(pageNum)] || []
                    acc[Number(pageNum)]?.push(span)
                }
                return acc
            }, {})

            this.onHighlight(pageSelection)
            this.highlighterObj?.removeAll()
            window.getSelection()?.removeAllRanges()
        })

        // 返回清理函数
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange)
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('touchend', handleTouchEnd)
            this.highlighterObj?.removeAll()
            this.highlighterObj = null
        }
    }

    highlight(range: Range) {
        this.highlighterObj?.fromRange(range)
    }
}
