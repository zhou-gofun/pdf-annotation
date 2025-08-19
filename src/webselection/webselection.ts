import Highlighter from 'web-highlighter'
// import { ActionsValue } from '../actions/actions'
import { ref } from 'vue'

/**
 * WebSelection 类用于处理网页选区的实用工具类
 */
interface HighlighterData {
    instance: Highlighter
    cleanup: () => void
}

export class WebSelection {
    private isEditing = ref(false)
    private onSelect: (pageNumber: number, elements: HTMLElement[]) => void
    private highlighterMap = new Map<number, HighlighterData>()

    /**
     * 构造一个新的 WebSelection 实例
     * @param options 配置选项
     * @param options.onSelect 当选区被选中时调用的回调函数
     */
    constructor({ onSelect }: { onSelect: (pageNumber: number, elements: HTMLElement[]) => void }) {
        this.onSelect = onSelect
    }

    /**
     * 在指定的根元素和页码上创建一个高亮器
     * @param root 要应用高亮器的根元素
     * @param pageNumber 与高亮器相关联的页码
     */
    public create(root: HTMLDivElement, pageNumber: number) {
        if (this.highlighterMap.has(pageNumber)) {
            return
        }

        const highlighter = new Highlighter({
            $root: root,
            wrapTag: 'mark'
        })

        const handleSelectionCreate = (data: { sources: Array<{ id: string }> }) => {
            const allSourcesId = data.sources.map(item => item.id)
            const allSourcesSpan = allSourcesId.flatMap(id => 
                highlighter.getDoms(id) || []
            )
            
            if (allSourcesSpan.length > 0) {
                this.onSelect(pageNumber, allSourcesSpan)
                highlighter.removeAll()
            }
        }

        highlighter.on('selection:create', handleSelectionCreate)
        
        // 现在可以正确存储包含 instance 和 cleanup 的对象
        this.highlighterMap.set(pageNumber, {
            instance: highlighter,
            cleanup: () => {
                highlighter.off('selection:create', handleSelectionCreate)
                highlighter.dispose()
            }
        })
    }

    /**
     * 运行指定页码上的高亮器
     * @param pageNumber 要运行高亮器的页码
     */
    private run(pageNumber: number) {
        const highlighterData = this.highlighterMap.get(pageNumber)
        if (highlighterData) {
            highlighterData.instance.run()
        }
    }

    /**
     * 启用编辑模式
     */
    public enable() {
        this.isEditing.value = true
        this.highlighterMap.forEach((_, pageNumber) => {
            this.run(pageNumber)
        })
    }

    /**
     * 禁用编辑模式
     */
    public disable() {
        this.isEditing.value = false
        this.highlighterMap.forEach(highlighterData => {
            highlighterData.instance.stop()
        })
    }

    /**
     * 销毁所有高亮器实例
     */
    public destroy() {
        this.highlighterMap.forEach(highlighterData => {
            (highlighterData as any).cleanup()
        })
        this.highlighterMap.clear()
    }

    /**
     * 获取当前编辑状态
     */
    public get editingStatus() {
        return this.isEditing.value
    }
}