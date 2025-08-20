import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'

import { Annotation, type IAnnotationStore, type IAnnotationStyle } from '../../const/definitions'
import { Editor, type IEditorOptions } from './editor'
import { h, ref } from 'vue'
import { Dropdown,  Modal } from 'ant-design-vue'
import TextArea from 'ant-design-vue/es/input/TextArea'
import { FontSizeIcon } from '../../const/icon'
import './editor_free_text.scss'
import i18n from 'i18next'
import { defaultOptions } from '../../const/default_options'
import { isSameColor } from '../../utils/utils'

/**
 * Vue3 版本的 setInputText
 */
export async function setInputText(color: string, fontSize: number): Promise<{ inputValue: string, color: string, fontSize: number }> {
    let currentColor = color
    let currentFontSize = fontSize
    return new Promise(resolve => {
        const placeholder = i18n.t('editor.text.startTyping')
        const inputValue = ref('')
        const status = ref<'error' | ''>('error')

        let modal: any

        const handleChange = (e: Event) => {
            const target = e.target as HTMLTextAreaElement
            inputValue.value = target.value
            status.value = inputValue.value.trim() !== '' ? '' : 'error'
            updateModalContent()
        }

        const handleColorChange = (c: string) => {
            currentColor = c
            updateModalContent()
        }

        const handleFontSizeChange = (size: number) => {
            currentFontSize = size
            updateModalContent()
        }

        const renderContent = () => {
            return h('div', { class: 'EditorFreeText-Modal' }, [
                h(TextArea, {
                    value: inputValue.value,
                    status: status.value,
                    placeholder,
                    autoSize: { minRows: 3, maxRows: 5 },
                    onInput: handleChange
                }),
                h('div', { class: 'EditorFreeText-Modal-Toolbar' }, [
                    h('div', { class: 'colorPalette' },
                        defaultOptions.colors.map(c =>
                            h('div', {
                                key: c,
                                class: ['cell', isSameColor(c, currentColor) ? 'active' : ''],
                                onClick: () => handleColorChange(c)
                            }, [h('span', { style: { backgroundColor: c } })])
                        )
                    ),
                    h(Dropdown, {
                        trigger: ['click'],
                        menu: {
                            items: defaultOptions.fontSize.map(size => ({
                                key: size.toString(),
                                label: size,
                                onClick: () => handleFontSizeChange(size)
                            }))
                        }
                    }, {
                        default: () => h(FontSizeIcon)
                    })
                ])
            ])
        }

        const updateModalContent = () => {
            modal.update({
                title: `${i18n.t('annotations.freeText')}-${currentFontSize}px`,
                content: renderContent(),
                okButtonProps: { disabled: status.value === 'error' }
            })
        }

        modal = Modal.confirm({
            title: `${i18n.t('annotations.freeText')}-${currentFontSize}px`,
            icon: null,
            content: renderContent(),
            // 移除 destroyOnClose 属性，因为它不是 ModalFuncProps 类型的有效属性
            // destroyOnClose: true,
            okText: i18n.t('normal.ok'),
            cancelText: i18n.t('normal.cancel'),
            okButtonProps: { disabled: status.value === 'error' },
            onOk: () => {
                resolve({ inputValue: inputValue.value, color: currentColor, fontSize: currentFontSize })
            },
            onCancel: () => {
                resolve({ inputValue: '', color: currentColor, fontSize: currentFontSize })
            }
        })
    })
}

/**
 * EditorFreeText 是继承自 Editor 的自由文本编辑器类。
 */
export class EditorFreeText extends Editor {
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: Annotation.FREETEXT })
    }

    protected mouseDownHandler() { }
    protected mouseMoveHandler() { }

    protected async mouseUpHandler(e: KonvaEventObject<PointerEvent>) {
        const pos = this.konvaStage.getRelativePointerPosition()
        const { x, y } = this.konvaStage.scale()
        if (e.currentTarget !== this.konvaStage) return

        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const { inputValue, color, fontSize } = await setInputText(
            this.currentAnnotation?.style?.color ?? defaultOptions.colors[0],
            this.currentAnnotation?.style?.fontSize ?? defaultOptions.fontSize[0]
        )
        if (pos) {
            this.inputDoneHandler(inputValue, { x, y }, pos, color, fontSize)
        }
    }

    private async inputDoneHandler(
        inputValue: string,
        _scale: { x: number; y: number },
        pos: { x: number; y: number },
        color: string,
        fontSize: number
    ) {
        const value = inputValue.trim()
        if (value === '') {
            if (this.currentShapeGroup?.id) {
                this.delShapeGroup(this.currentShapeGroup.id)
            }
            this.currentShapeGroup = null
            return
        }
        const tempText = new Konva.Text({ text: value, fontSize, padding: 2 })
        const textWidth = tempText.width()
        const maxWidth = 300
        const finalWidth = textWidth > maxWidth ? maxWidth : textWidth

        const text = new Konva.Text({
            x: pos.x,
            y: pos.y + 2,
            text: value,
            width: finalWidth,
            fontSize,
            fill: color,
            wrap: textWidth > maxWidth ? 'word' : 'none'
        })
        this.currentShapeGroup?.konvaGroup.add(text)

        const id = this.currentShapeGroup?.konvaGroup?.id() ?? ''
        this.setShapeGroupDone({
            id,
            contentsObj: { text: value },
            color,
            fontSize
        })
    }

    protected changeStyle(annotationStore: IAnnotationStore, styles: IAnnotationStyle): void {
        const id = annotationStore.id
        const group = this.getShapeGroupById(id)
        if (group) {
            group.getChildren().forEach(shape => {
                if (shape instanceof Konva.Text) {
                    if (styles.color !== undefined) shape.fill(styles.color)
                    if (styles.opacity !== undefined) shape.opacity(styles.opacity)
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
