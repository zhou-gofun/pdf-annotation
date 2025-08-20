import type { Annotation, FreeTextAnnotation } from 'pdfjs'
import { Decoder, type IDecoderOptions } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { Annotation as AnnotationDef, type IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class FreeTextDecoder extends Decoder {
    constructor(options: IDecoderOptions) {
        super(options)
    }

    public decodePdfAnnotation(annotation: FreeTextAnnotation, allAnnotations: Annotation[]): IAnnotationStore {
        const color = convertToRGB(annotation.defaultAppearanceData.fontColor as [number, number, number]);
        const fontSize = annotation.defaultAppearanceData.fontSize;
        const textStr = annotation.contentsObj.str
        const { x, y } = this.convertRect(
            annotation.rect,
            annotation.pageViewer.viewport.scale,
            annotation.pageViewer.viewport.height
        );
    
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        });
    
        const text = new Konva.Text({
            x,
            y: y + 2,
            text: textStr,
            // width,
            fontSize,
            fill: color,
        });
        
        ghostGroup.add(text);
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            konvaString: ghostGroup.toJSON(),
            konvaClientRect: ghostGroup.getClientRect(),
            title: annotation.titleObj.str,
            type: AnnotationDef.FREETEXT,
            color,
            fontSize,
            pdfjsType: annotation.annotationType,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            subtype: annotation.subtype,
            date: annotation.modificationDate ?? '',
            contentsObj: {
                text: textStr
            },
            comments: this.getComments(annotation, allAnnotations),
            draggable: true,
            resizable: true
        };
    
        return annotationStore;
    }
    
}
