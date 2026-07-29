
import { Type } from "@google/genai";

const contentPartSchema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING },
        isBold: { type: Type.BOOLEAN },
        isItalic: { type: Type.BOOLEAN },
        isSuperscript: { type: Type.BOOLEAN },
        isSubscript: { type: Type.BOOLEAN },
        url: { type: Type.STRING },
        isNote: { type: Type.BOOLEAN },
        noteRef: { type: Type.STRING }
    },
    required: ["text"]
};

export const geminiSchema = {
    type: Type.OBJECT,
    properties: {
        metadata: {
            type: Type.OBJECT,
            properties: {
                publicationDate: { type: Type.STRING },
                documentType: { type: Type.STRING },
                publicationSource: { type: Type.STRING },
                issuingOrganism: { type: Type.STRING },
                documentTitle: { type: Type.STRING },
                thematicArea: { type: Type.STRING },
            }
        },
        content: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "structural_header, paragraph, table, note_definition, figure" },
                    level: { type: Type.STRING, description: "Hierarchy code based on highlight color: PRE (Red), RB, TIT, C, S, SS (Green), A (Magenta/Cyan), TR, AN, SEC" },
                    number: { type: Type.STRING },
                    superior: { type: Type.STRING, description: "ID of the parent unit to maintain hierarchy tree" },
                    title: { type: Type.STRING },
                    customId: { type: Type.STRING, description: "Unique ID e.g. ART.5 or CAP.2" },
                    parts: {
                        type: Type.ARRAY,
                        items: contentPartSchema
                    },
                    alignment: { type: Type.STRING },
                    ref: { type: Type.STRING },
                    rows: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                cells: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            parts: { type: Type.ARRAY, items: contentPartSchema },
                                            align: { type: Type.STRING, description: "left, center, right, justify" },
                                            valign: { type: Type.STRING, description: "top, middle, bottom" },
                                            colspan: { type: Type.NUMBER },
                                            rowspan: { type: Type.NUMBER }
                                        }
                                    }
                                }
                            }
                        }
                    },
                },
                required: ["type"]
            }
        }
    },
    required: ["metadata", "content"]
};
