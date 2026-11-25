export interface Bookmark {
  id: string;
  name: string;
  type: 'icon' | 'component' | 'pageGroup';
  size?: string;
  src?: string;
  url?: string;
  sort: number;
  pageGroup?: string;
  pid?: string | null;
  component?: string;
  name_en?: string;
  tips?: string;
  bgColor?: string | null;
  text?: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}
export interface Preferences {
  background: string;
  dim: number;
  blur: number;
  showSeconds: boolean;
  showDock: boolean;
  showNames: boolean;
  newTab: boolean;
  gap: number;
}
