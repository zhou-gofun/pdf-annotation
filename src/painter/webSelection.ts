
import Highlighter from 'web-highlighter'

export class WebSelection {
    isEditing = false
    onSelect: (range: Range | null, isOnExistingAnnotation?: boolean) => void
    onHighlight: (selection: Partial<Record<number, any[]>>) => void
    onAutoAnnotate?: (range: Range) => void  // 新增自动注释回调
    highlighterObj: Highlighter | null = null

    private isSelecting = false
    private isViewMode = false

    constructor({
        onSelect,
        onHighlight,
        onAutoAnnotate
    }: {
        onSelect: (range: Range | null, isOnExistingAnnotation?: boolean) => void
        onHighlight: (selection: Partial<Record<number, any[]>>) => void
        onAutoAnnotate?: (range: Range) => void
    }) {
        this.onSelect = onSelect
        this.onHighlight = onHighlight
        this.onAutoAnnotate = onAutoAnnotate
    }

    setViewMode(isViewMode: boolean) {
        this.isViewMode = isViewMode
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
                            // 检查是否点击在现有注释上
                            const isOnExistingAnnotation = this.checkIfClickOnAnnotation(range)
                            
                            if (this.isViewMode) {
                                if (isOnExistingAnnotation) {
                                    // 在View模式下点击现有注释，显示修改popbar
                                    this.onSelect(range, true) // 传递标志表示这是选中现有注释
                                } else {
                                    // 在View模式下选择无注释的文本，显示常规popbar
                                    this.onSelect(range)
                                }
                            } else {
                                // 非View模式下的处理逻辑
                                if (this.onAutoAnnotate) {
                                    this.onAutoAnnotate(range)
                                } else {
                                    this.onSelect(range)
                                }
                            }
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
                            // 如果有自动注释回调并且当前有选中的工具，则自动应用
                            if (this.onAutoAnnotate) {
                                this.onAutoAnnotate(range)
                            } else {
                                this.onSelect(range)
                            }
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

    checkIfClickOnAnnotation(range: Range): boolean {
        // 检查选择区域内是否包含注释元素
        const container = range.commonAncestorContainer
        let element: Element | null = null
        
        if (container.nodeType === Node.TEXT_NODE) {
            element = container.parentElement
        } else if (container.nodeType === Node.ELEMENT_NODE) {
            element = container as Element
        }
        
        while (element) {
            // 检查是否是PDF.js的注释层或者其他注释相关的元素
            if (element.classList.contains('annotationLayer') || 
                element.classList.contains('textLayer') ||
                element.hasAttribute('data-annotation-id') ||
                element.tagName === 'MARK' || // web-highlighter 创建的高亮
                element.closest('[data-annotation-id]')) {
                
                // 进一步检查是否真的在注释上
                const rect = range.getBoundingClientRect()
                const elementsAtPoint = document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2)
                
                // 检查这些元素中是否有注释相关的
                return elementsAtPoint.some(el => 
                    el.hasAttribute('data-annotation-id') ||
                    el.tagName === 'MARK' ||
                    el.closest('[data-annotation-id]') !== null ||
                    el.closest('.annotationLayer') !== null
                )
            }
            element = element.parentElement
        }
        
        return false
    }

    highlight(range: Range) {
        this.highlighterObj?.fromRange(range)
    }
}
