
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
            if (!selection || selection.type === 'Caret' || selection.rangeCount === 0) {
                this.onSelect(null) // 清除选择时隐藏工具栏
                return
            }
            try {
                const range = selection.getRangeAt(0)
                if (root.contains(range.commonAncestorContainer)) {
                    this.isSelecting = true
                    // 不再在 selectionchange 事件中立即显示工具栏
                    // 只标记为正在选择状态
                } else {
                    // 如果选择不在根容器内，也清除选择
                    this.onSelect(null)
                }
            } catch (error) {
                console.warn('Selection error:', error)
                this.onSelect(null)
            }
        }

        const handleMouseUp = () => {
            if (!this.isSelecting) return
            this.isSelecting = false
            
            // 使用 setTimeout 确保在选择完全稳定后再显示工具栏
            setTimeout(() => {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                    try {
                        const range = selection.getRangeAt(0)
                        // 只有当选择非空且包含文本时才触发
                        if (!range.collapsed && range.toString().trim().length > 0) {
                            this.onSelect(range)
                        } else {
                            this.onSelect(null)
                        }
                    } catch (error) {
                        console.warn('MouseUp selection error:', error)
                        this.onSelect(null)
                    }
                } else {
                    this.onSelect(null)
                }
            }, 10) // 10ms 延迟确保选择稳定
        }

        const handleTouchEnd = () => {
            if (!this.isSelecting) return
            this.isSelecting = false
            
            // 使用 setTimeout 确保在选择完全稳定后再显示工具栏
            setTimeout(() => {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                    try {
                        const range = selection.getRangeAt(0)
                        // 只有当选择非空且包含文本时才触发
                        if (!range.collapsed && range.toString().trim().length > 0) {
                            this.onSelect(range)
                        } else {
                            this.onSelect(null)
                        }
                    } catch (error) {
                        console.warn('TouchEnd selection error:', error)
                        this.onSelect(null)
                    }
                } else {
                    this.onSelect(null)
                }
            }, 10) // 10ms 延迟确保选择稳定
        }

        const handleDocumentClick = (event: MouseEvent) => {
            // 如果点击的不是PDF文档区域且不是工具栏，清除选择
            const target = event.target as HTMLElement
            const clickedPopbar = target.closest('.CustomPopbar')
            
            if (!root.contains(target) && !clickedPopbar) {
                // 清除文本选择
                const selection = window.getSelection()
                if (selection) {
                    selection.removeAllRanges()
                }
                this.onSelect(null)
            }
        }

        document.addEventListener('selectionchange', handleSelectionChange)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchend', handleTouchEnd)
        document.addEventListener('click', handleDocumentClick) // 添加点击监听

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
            document.removeEventListener('click', handleDocumentClick) // 移除点击监听
            this.highlighterObj?.removeAll()
            this.highlighterObj = null
        }
    }

    highlight(range: Range) {
        this.highlighterObj?.fromRange(range)
    }
}
