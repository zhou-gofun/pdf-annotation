// 替代 enum
const ActionsValue = {
    None: 0,
    Highlight: 1,
    Strikeout: 2,
    Underline: 3,
    Rect: 4,
    Ellipse: 5,
    Text: 6
};

type ActionValueType = typeof ActionsValue[keyof typeof ActionsValue];

type Action = {
    name: string;
    value: ActionValueType;
};

const Actions = [
    {
        name: '默认',
        value: ActionsValue.None
    },
    {
        name: '高亮',
        value: ActionsValue.Highlight
    },
    {
        name: '删除线',
        value: ActionsValue.Strikeout
    },
    {
        name: '下划线',
        value: ActionsValue.Underline
    },
    {
        name: '矩形',
        value: ActionsValue.Rect
    },
    {
        name: '圆形',
        value: ActionsValue.Ellipse
    },
    {
        name: '文字',
        value: ActionsValue.Text
    }
] as const

export { Actions, ActionsValue };
export type { Action, ActionValueType };
