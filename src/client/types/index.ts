export type Screen =
  | 'idle'
  | 'payment'
  | 'template'
  | 'capture'
  | 'filter'
  | 'form'
  | 'print';

export interface AppState {
  screen: Screen;
  selectedTemplate: string | null;
  activeFilter: string;
  photosNeeded: number;
  capturedCount: number;
  sessionTimeLeft: number;
  timerStarted: boolean;
  sessionId: string | null;
  printStatus: 'idle' | 'success' | 'failed';
  doodleEnabled: boolean;
  selectedDoodleTheme: string;
}

export type AppAction =
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SELECT_TEMPLATE'; payload: string }
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'SET_PHOTOS_NEEDED'; payload: number }
  | { type: 'INCREMENT_CAPTURED' }
  | { type: 'RESET_CAPTURED' }
  | { type: 'SET_CAPTURED_COUNT'; payload: number }
  | { type: 'SET_SESSION_TIME'; payload: number }
  | { type: 'TICK_TIMER' }
  | { type: 'START_TIMER' }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_PRINT_STATUS'; payload: 'idle' | 'success' | 'failed' }
  | { type: 'TOGGLE_DOODLES'; payload: boolean }
  | { type: 'SET_DOODLE_THEME'; payload: string }
  | { type: 'RESET' };

export interface UserData {
  name?: string;
  wa?: string;
  email?: string;
}

export interface SavePhotoResponse {
  success: boolean;
  filename?: string;
  printed?: boolean;
  session_id?: string;
  expires_at?: string;
  message?: string;
}

export interface SessionData {
  session_id: string;
  composed_url: string;
  gif_url: string;
  video_url: string;
  photos: string[];
  name: string | null;
  wa: string | null;
  email: string | null;
  template: string | null;
  filter: string | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

export interface SavePhotoPayload {
  composedBase64: string;
  photos: string[];
  userData: UserData;
  template: string;
  filter: string;
  videoBase64?: string;
}

export interface TemplateDef {
  id: string;
  name: string;
  previewUrl: string;
}

import { getTemplateConfig } from '../utils/templates';

export function getPhotoCount(templateId: string): number {
  return getTemplateConfig(templateId).photoCount;
}

export const TEMPLATES: TemplateDef[] = [
  { id: 'frame1', name: 'Receipt Style 1', previewUrl: 'assets/1.png' },
  { id: 'frame2', name: 'Receipt Style 2', previewUrl: 'assets/2.png' },
];

export const FILTER_OPTIONS = [
  { id: 'none', label: 'Normal' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'contrast', label: 'Hi-Contrast' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'cool', label: 'Cool Tone' },
] as const;
