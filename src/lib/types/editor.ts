// 自作リッチエディターの型定義

export type BlockType = 
  | 'paragraph'
  | 'header'
  | 'list'
  | 'quote'
  | 'code'
  | 'image'
  | 'delimiter'
  | 'checklist';

export type Alignment = 'left' | 'center' | 'right';

export type ListStyle = 'ordered' | 'unordered';

export interface BlockData {
  text?: string;
  level?: number;
  items?: ChecklistItem[];
  code?: string;
  language?: string;
  url?: string;
  caption?: string;
  stretched?: boolean;
  withBorder?: boolean;
  withBackground?: boolean;
  alignment?: Alignment;
  listStyle?: ListStyle;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
  tunes?: {
    alignment?: Alignment;
  };
}

export interface EditorData {
  blocks: Block[];
  version: string;
}

export interface EditorProps {
  value?: EditorData;
  placeholder?: string;
  onChange?: (data: EditorData) => void;
  onSave?: (data: EditorData) => void;
  onImageUpload?: (file: File) => Promise<string | void>;
  readOnly?: boolean;
  minHeight?: number;
  className?: string;
}

export interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: boolean;
  color: string;
}

export interface HistoryEntry {
  data: EditorData;
  timestamp: number;
}
