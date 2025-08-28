import type { VNode } from 'vue'
import type { IRect } from 'konva/lib/types'
import { defaultOptions } from './default_options'
import {
    CircleIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    RectangleIcon,
    SelectIcon,
    SignatureIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon,
    SquigglyIcon,
    NoteIcon,
    ArrowIcon,
    CloudIcon,
    EraserIcon
} from './icon'

export type PdfjsAnnotationSubtype =
    | 'Link'
    | 'Text'
    | 'Widget'
    | 'Popup'
    | 'FreeText'
    | 'Line'
    | 'Square'
    | 'Circle'
    | 'PolyLine'
    | 'Polygon'
    | 'Caret'
    | 'Ink'
    | 'Highlight'
    | 'Underline'
    | 'Squiggly'
    | 'StrikeOut'
    | 'Stamp'
    | 'FileAttachment'
    | 'Note'
    | 'Arrow'

// PDF.js 批注类型
export const PdfjsAnnotation = {
    NONE: 0,
    TEXT: 1,
    LINK: 2,
    FREETEXT: 3,
    LINE: 4,
    SQUARE: 5,
    CIRCLE: 6,
    POLYGON: 7,
    POLYLINE: 8,
    HIGHLIGHT: 9,
    UNDERLINE: 10,
    SQUIGGLY: 11,
    STRIKEOUT: 12,
    STAMP: 13,
    CARET: 14,
    INK: 15,
    POPUP: 16,
    FILEATTACHMENT: 17,
    SOUND: 18,
    MOVIE: 19,
    WIDGET: 20,
    SCREEN: 21,
    PRINTERMARK: 22,
    TRAPNET: 23,
    WATERMARK: 24,
    THREED: 25,
    REDACT: 26,
    NOTE: 27
}

export type PdfjsAnnotationType = typeof PdfjsAnnotation[keyof typeof PdfjsAnnotation]


// PDF.js 自带的批注编辑器类型枚举
// 用于定义 PDF.js 支持的批注类型
export const PdfjsAnnotationEditorType = {
    DISABLE: -1, // 禁用批注编辑器
    NONE: 0, // 没有批注类型
    FREETEXT: 3, // 自由文本批注
    HIGHLIGHT: 9, // 高亮批注
    STAMP: 13, // 盖章批注
    INK: 15 // 墨迹（自由绘制）批注
}

// 自定义的批注类型枚举
// 用于定义在应用中使用的批注类型
export const Annotation = {
    NONE: -1, // 没有批注类型
    SELECT: 0, // 选择批注
    HIGHLIGHT: 1, // 高亮批注
    STRIKEOUT: 2, // 删除线批注
    UNDERLINE: 3, // 下划线批注
    SQUIGGLY: 4, // 波浪线批注
    FREETEXT: 5, // 自由文本批注
    RECTANGLE: 6, // 矩形批注
    CIRCLE: 7, // 圆形批注
    FREEHAND: 8, // 自由绘制批注
    FREE_HIGHLIGHT: 9, // 自由高亮批注
    SIGNATURE: 10, // 签名批注
    STAMP: 11, // 盖章批注
    NOTE: 12, // 注释
    ARROW: 13, // 箭头批注
    CLOUD: 14, // 云线
    ERASER: 15 // 橡皮擦
}

export interface AnnotationType {
    NONE: number
    SELECT: number, // 选择批注
    HIGHLIGHT: number, // 高亮批注
    STRIKEOUT: number, // 删除线批注
    UNDERLINE: number, // 下划线批注
    SQUIGGLY: number, // 波浪线批注
    FREETEXT: number, // 自由文本批注
    RECTANGLE: number, // 矩形批注
    CIRCLE: number, // 圆形批注
    FREEHAND: number, // 自由绘制批注
    FREE_HIGHLIGHT: number, // 自由高亮批注
    SIGNATURE: number, // 签名批注
    STAMP: number, // 盖章批注
    NOTE: number, // 注释
    ARROW: number, // 箭头批注
    CLOUD: number, // 云线
    ERASER: number // 橡皮擦
}


// 定义批注类型的接口
// 用于描述应用中支持的批注类型
export interface IAnnotationType {
    name: string // 批注的名称
    type: typeof Annotation[keyof typeof Annotation] // 自定义的批注类型
    pdfjsEditorType: typeof PdfjsAnnotationEditorType[keyof typeof PdfjsAnnotationEditorType] // 对应的 Pdfjs 批注类型
    pdfjsAnnotationType: PdfjsAnnotationType
    subtype?: PdfjsAnnotationSubtype
    isOnce: boolean // 是否只绘制一次
    resizable: boolean // 是否可调整大小
    draggable: boolean // 是否可拖动位置
    icon?: () => VNode // 🔑 改成函数 // 可选的图标，用于表示批注类型
    style?: IAnnotationStyle // 可选的样式配置对象
    styleEditable?: {
        color: boolean
        strokeWidth: boolean
        opacity: boolean
    }
}

// 批注的样式配置接口
// 用于描述批注的外观样式
export interface IAnnotationStyle {
    color?: string // 线条、文本、填充的颜色
    fontSize?: number // 字体大小
    opacity?: number // 透明度
    strokeWidth?: number // 边框宽度
}

// 批注的内容接口
// 用于描述批注的文本或图像内容
export interface IAnnotationComment {
    id: string;
    title: string; // 批注标题
    date: string; // 批注日期
    content: string; // 批注内容
    status?: typeof CommentStatus[keyof typeof CommentStatus];
}

export const CommentStatus = {
    Accepted: 'Accepted',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
    Completed: 'Completed',
    None: 'None',
    Closed: 'Closed'
}

export interface CommentStatusType {
    Accepted: string;
    Rejected: string;
    Cancelled: string;
    Completed: string;
    None: string;
    Closed: string;
}

export interface IAnnotationContentsObj {
    text: string; // 文本内容
    image?: string; // 可选的图片属性
}

// 批注存储接口
// 用于描述存储在应用中的批注信息
export interface IAnnotationStore {
    id: string; // 批注的唯一标识符
    pageNumber: number; // 批注所在的页码
    konvaString: string; // Konva 的序列化表示
    konvaClientRect: IRect; // 批注在 stage 中的位置
    title: string; // 批注标题
    type: typeof Annotation[keyof typeof Annotation]; // 批注类型
    color?: string | null; // 可选颜色，可以是 undefined 或 null
    subtype: PdfjsAnnotationSubtype;
    fontSize?: number | null;
    pdfjsType: PdfjsAnnotationType; // PDF.js 批注类型
    pdfjsEditorType: typeof PdfjsAnnotationEditorType[keyof typeof PdfjsAnnotationEditorType]; // PDF.js 编辑器类型
    date: string; // 创建或修改日期
    contentsObj?: IAnnotationContentsObj | null; // 可选的内容对象
    comments: IAnnotationComment[]; // 与批注相关的评论数组
    resizable: boolean // 是否可调整大小
    draggable: boolean // 是否可拖动位置
}



// 批注类型定义数组
// 用于描述所有支持的批注类型及其属性
export const annotationDefinitions: IAnnotationType[] = [
    {
        name: 'select', // 批注名称
        type: Annotation.SELECT, // 批注类型
        pdfjsEditorType: PdfjsAnnotationEditorType.NONE, // 对应的 PDF.js 批注类型
        pdfjsAnnotationType: PdfjsAnnotation.NONE,
        isOnce: false, // 是否只绘制一次
        resizable: false,
        draggable: false,
        icon: SelectIcon, // 图标
    },
    {
        name: 'highlight',
        type: Annotation.HIGHLIGHT,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotation.HIGHLIGHT,
        subtype: 'Highlight',
        isOnce: false,
        resizable: false,
        draggable: false,
        icon: HighlightIcon,
        style: {
            color: defaultOptions.setting.HIGHLIGHT_COLOR, // 默认高亮颜色
        },
        styleEditable: {
            color: true,
            strokeWidth: false,
            opacity: false,
        }, // 是否可编辑样式
    },
    {
        name: 'strikeout',
        type: Annotation.STRIKEOUT,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotation.STRIKEOUT,
        subtype: 'StrikeOut',
        isOnce: false,
        resizable: false,
        draggable: false,
        icon: StrikeoutIcon,
        style: {
            color: defaultOptions.setting.STRIKEOUT_COLOR, // 默认删除线颜色
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: false,
        } // 是否可编辑样式
    },
    {
        name: 'underline',
        type: Annotation.UNDERLINE,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotation.UNDERLINE,
        subtype: 'Underline',
        isOnce: false,
        resizable: false,
        draggable: false,
        icon: UnderlineIcon,
        style: {
            color: defaultOptions.setting.UNDERLINE_COLOR, // 默认下划线颜色
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: false
        } // 是否可编辑样式
    },
    {
        name: 'squiggly',
        type: Annotation.SQUIGGLY,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotation.SQUIGGLY,
        subtype: 'Squiggly',
        isOnce: false,
        resizable: false,
        draggable: false,
        icon: SquigglyIcon,
        style: {
            color: defaultOptions.setting.SQUIGGLY_COLOR, // 默认波浪线颜色
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'rectangle',
        type: Annotation.RECTANGLE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.SQUARE,
        subtype: 'Square',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: RectangleIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认矩形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'circle',
        type: Annotation.CIRCLE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.CIRCLE,
        subtype: 'Circle',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: CircleIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认圆形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'note',
        type: Annotation.NOTE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.TEXT,
        subtype: 'Text',
        isOnce: true,
        resizable: false,
        draggable: true,
        icon: NoteIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认note颜色
        },
        styleEditable: {
            color: true,
            opacity: false,
            strokeWidth: false
        } // 是否可编辑样式
    },
    {
        name: 'arrow',
        type: Annotation.ARROW,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.LINE,
        subtype: 'Arrow',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: ArrowIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认圆形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'cloud',
        type: Annotation.CLOUD,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.POLYLINE,
        subtype: 'PolyLine',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: CloudIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认圆形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'freehand',
        type: Annotation.FREEHAND,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.INK,
        subtype: 'Ink',
        isOnce: false, // 改为持续有效
        resizable: true,
        draggable: true,
        icon: FreehandIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认自由绘制颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'freeHighlight',
        type: Annotation.FREE_HIGHLIGHT,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotation.INK,
        subtype: 'Highlight',
        isOnce: false, // 改为持续有效
        resizable: true,
        draggable: true,
        icon: FreeHighlightIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认自由高亮颜色
            strokeWidth: 10, // 默认线条宽度
            opacity: 0.5 // 默认透明度
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: true
        } // 是否可编辑样式
    },
    {
        name: 'freeText',
        type: Annotation.FREETEXT,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotation.FREETEXT,
        subtype: 'FreeText',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: FreetextIcon,
        style: {
            color: defaultOptions.setting.COLOR, // 默认文字颜色
            fontSize: defaultOptions.setting.FONT_SIZE, // 默认字体大小
        },
        styleEditable: {
            color: true,
            opacity: true,
            strokeWidth: false
        } // 是否可编辑样式
    },
    {
        name: 'signature',
        type: Annotation.SIGNATURE,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotation.STAMP,
        subtype: 'Caret',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: SignatureIcon
    },
    {
        name: 'stamp',
        type: Annotation.STAMP,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotation.STAMP,
        subtype: 'Stamp',
        isOnce: true,
        resizable: true,
        draggable: true,
        icon: StampIcon
    },
    {
        name: 'eraser',
        type: Annotation.ERASER,
        pdfjsEditorType: PdfjsAnnotationEditorType.NONE,
        pdfjsAnnotationType: PdfjsAnnotation.NONE,
        subtype: undefined,
        isOnce: false,
        resizable: false,
        draggable: false,
        icon: EraserIcon
    }
]

export const HASH_PARAMS_PREFIX = 'ae'

export const HASH_PARAMS_USERNAME = `${HASH_PARAMS_PREFIX}_username` // 用户名

export const HASH_PARAMS_GET_URL = `${HASH_PARAMS_PREFIX}_get_url`  // 数据获取默认地址

export const HASH_PARAMS_POST_URL = `${HASH_PARAMS_PREFIX}_post_url` // 保存地址

export const HASH_PARAMS_DEFAULT_EDITOR_ACTIVE = `${HASH_PARAMS_PREFIX}_default_editor_active` // 是否激活编辑器

export const HASH_PARAMS_DEFAULT_SIDEBAR_OPEN = `${HASH_PARAMS_PREFIX}_default_sidebar_open` // 是否打侧边栏
