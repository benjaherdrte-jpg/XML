
export interface FileState {
  file: File | null;
  base64: string | null;
  name: string;
}

export interface XmlResult {
  metadata: string;
  content: string;
  metadataFilename: string;
  contentFilename: string;
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'ai';
}

export interface ParsedMetadata {
  publicationDate: string;
  documentType: string;
  publicationSource: string;
  issuingOrganism: string;
  documentTitle: string;
  thematicArea: string;
}

export interface ContentPart {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isSuperscript?: boolean;
  isSubscript?: boolean;
  url?: string;
  isNote?: boolean;
  noteRef?: string;
}

export interface ContentUnit {
  type: 'structural_header' | 'paragraph' | 'table' | 'note_definition' | 'figure';
  // Actualizado para reflejar los códigos visuales (Color Mapping)
  level?: 'PRE' | 'RB' | 'TIT' | 'C' | 'S' | 'SS' | 'A' | 'TR' | 'AN' | 'SEC' | string; 
  number?: string; 
  superior?: string; 
  title?: string;
  customId?: string;
  parts?: ContentPart[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  children?: ContentUnit[];
  rows?: {
    cells: {
      parts: ContentPart[];
      align?: string;
      valign?: string;
      rowspan?: number;
      colspan?: number;
    }[];
  }[];
  ref?: string;
}

export interface ParsedDocument {
  metadata: ParsedMetadata;
  content: ContentUnit[];
}
