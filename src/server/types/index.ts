export interface UserData {
  name?: string;
  wa?: string;
  email?: string;
}

export interface SavePhotoRequest {
  composedBase64: string;
  photos: string[];
  userData: UserData;
  template: string;
  filter: string;
  videoBase64?: string;
}

export interface SavePhotoResponse {
  success: boolean;
  filename?: string;
  session_id?: string;
  expires_at?: string;
  message?: string;
}

export interface PhotoRecord {
  id: number;
  filename: string;
  name: string | null;
  wa: string | null;
  email: string | null;
  template: string | null;
  filter: string | null;
  created_at: string;
}

export interface SessionRecord {
  session_id: string;
  composed_file: string;
  photos_json: string;
  name: string | null;
  wa: string | null;
  email: string | null;
  template: string | null;
  filter_text: string | null;
  video_file: string | null;
  expires_at: string;
  created_at: string;
}

export interface SessionResponse {
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

export interface PrintConfig {
  type: 'usb' | 'ble' | 'exe';
  interface?: string;
  exePath?: string;
  width?: number;
  characterCode?: string;
}
