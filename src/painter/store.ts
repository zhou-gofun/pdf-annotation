import type { PDFViewerApplication } from 'pdfjs'

import type { IAnnotationStore } from '../const/definitions'
import { formatTimestamp } from '../utils/utils'

export class Store {
    // 所有注释
    private annotationStore: Map<string, IAnnotationStore> = new Map()
    // 原有注释
    private originalAnnotationStore: Map<string, IAnnotationStore> = new Map()
    // 历史记录
    private history: Array<Map<string, IAnnotationStore>> = []
    // 当前历史索引
    private currentHistoryIndex: number = -1
    // 最大历史记录数
    private maxHistorySize: number = 50
    
    public pdfViewerApplication: PDFViewerApplication
    

    constructor({ PDFViewerApplication }: { PDFViewerApplication: PDFViewerApplication }) {
        this.pdfViewerApplication = PDFViewerApplication
        // 初始化时保存初始状态
        this.saveToHistory()
    }

    /**
     * 保存当前状态到历史记录
     */
    private saveToHistory(): void {
        // 创建当前状态的深拷贝
        const currentState = new Map()
        for (const [id, annotation] of this.annotationStore) {
            currentState.set(id, { ...annotation })
        }

        // 如果不是在历史记录末尾，删除之后的记录
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1)
        }

        // 添加新状态
        this.history.push(currentState)
        this.currentHistoryIndex++

        // 限制历史记录数量
        if (this.history.length > this.maxHistorySize) {
            this.history.shift()
            this.currentHistoryIndex--
        }
    }

    /**
     * 获取指定 ID 的注释
     * @param id - 注释的 ID
     * @returns 注释对象，如果存在则返回，否则返回 undefined
     */
    get annotation() {
        return (id: string) => this.annotationStore.get(id)
    }

    get annotations() {
        return Array.from(this.annotationStore.values());
    }

    /**
     * 保存注释
     * @param store  
     * @param isOriginal  是否是原有注释
     */
    public save(store: IAnnotationStore, isOriginal: boolean) {
        this.annotationStore.set(store.id, store)
        if(isOriginal) {
            this.originalAnnotationStore.set(store.id, store)
        } else {
            // 只有非原有注释才保存历史记录
            this.saveToHistory()
        }
        return store
    }

    /**
     * 更新指定 ID 的注释
     * @param id - 注释的 ID
     * @param updates - 更新的部分注释数据
     */
    public update(id: string, updates: Partial<IAnnotationStore>) {
        if (this.annotationStore.has(id)) {
            const existingAnnotation = this.annotationStore.get(id)
            if (existingAnnotation) {
                const updatedAnnotation = {
                    ...existingAnnotation,
                    ...updates,
                    date: formatTimestamp(Date.now())
                }
                this.annotationStore.set(id, updatedAnnotation)
                this.saveToHistory()
                return updatedAnnotation
            }
        } else {
            console.warn(`Annotation with id ${id} not found.`)
            return null
        }
    }

    /**
     * 根据页面号获取注释
     * @param pageNumber - 页码
     * @returns 指定页面的注释列表
     */
    public getByPage(pageNumber: number): IAnnotationStore[] {
        return Array.from(this.annotationStore.values()).filter(annotation => annotation.pageNumber === pageNumber)
    }

    /**
     * 删除指定 ID 的注释
     * @param id - 要删除的注释的 ID
     */
    public delete(id: string): void {
        if (this.annotationStore.has(id)) {
            this.annotationStore.delete(id)
            this.saveToHistory()
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

    /**
     * 撤销操作
     */
    public undo(): boolean {
        if (this.canUndo()) {
            this.currentHistoryIndex--
            this.restoreFromHistory()
            return true
        }
        return false
    }

    /**
     * 重做操作
     */
    public redo(): boolean {
        if (this.canRedo()) {
            this.currentHistoryIndex++
            this.restoreFromHistory()
            return true
        }
        return false
    }

    /**
     * 是否可以撤销
     */
    public canUndo(): boolean {
        return this.currentHistoryIndex > 0
    }

    /**
     * 是否可以重做
     */
    public canRedo(): boolean {
        return this.currentHistoryIndex < this.history.length - 1
    }

    /**
     * 从历史记录恢复状态
     */
    private restoreFromHistory(): void {
        if (this.currentHistoryIndex >= 0 && this.currentHistoryIndex < this.history.length) {
            const historicalState = this.history[this.currentHistoryIndex]
            
            // 清除当前状态
            this.annotationStore.clear()
            
            // 恢复历史状态
            for (const [id, annotation] of historicalState) {
                this.annotationStore.set(id, { ...annotation })
            }
        }
    }

}
