export interface AdminStats {
  totalSessions: number;
  activeSessions: number;
  todaySessions: number;
  totalPhotos: number;
  storageBytes: number;
  printFiles: number;
  dbSizeBytes: number;
  uptime: number;
}

export interface AdminSessionRow {
  session_id: string;
  composed_url: string;
  gif_url: string;
  video_url: string;
  photos: string[];
  name: string | null;
  wa: string | null;
  email: string | null;
  template: string | null;
  filter_text: string | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

export interface PaginatedResult {
  sessions: AdminSessionRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (res.status === 401) {
    throw new Error('Authentication required');
  }

  const body = await res.json() as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.message || 'Request failed');
  }
  return body.data as T;
}

export function fetchStats(): Promise<AdminStats> {
  return request<AdminStats>('/api/admin/stats');
}

export function fetchSessions(page = 1, limit = 20, search?: string): Promise<PaginatedResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return request<PaginatedResult>(`/api/admin/sessions?${params}`);
}

export function fetchSessionDetail(sessionId: string): Promise<AdminSessionRow> {
  return request<AdminSessionRow>(`/api/admin/sessions/${sessionId}`);
}

export function deleteSession(sessionId: string): Promise<{ deleted: boolean; filesRemoved: number }> {
  return request<{ deleted: boolean; filesRemoved: number }>(
    `/api/admin/sessions/${sessionId}`,
    { method: 'DELETE' }
  );
}

export function reprintSession(sessionId: string): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/admin/reprint/${sessionId}`,
    { method: 'POST' }
  );
}

export function triggerManualCleanup(): Promise<{ sessionsRemoved: number; filesRemoved: number }> {
  return request<{ sessionsRemoved: number; filesRemoved: number }>(
    '/api/admin/cleanup',
    { method: 'POST' }
  );
}

interface SSECallbacks {
  onStats: (stats: AdminStats) => void;
  onSessions: (sessions: AdminSessionRow[]) => void;
}

export function connectSSE(callbacks: SSECallbacks): AbortController {
  const controller = new AbortController();

  const connect = async (retryMs = 3000) => {
    try {
      const response = await fetch('/api/admin/events', {
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok || !response.body) {
        if (response.status >= 400 && response.status < 500) {
          return;
        }
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'stats') {
              callbacks.onStats(data);
            } else if (currentEvent === 'sessions') {
              callbacks.onSessions(data);
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const next = Math.min(retryMs * 2, 30000);
        setTimeout(() => connect(next), retryMs);
      }
    }
  };

  connect();
  return controller;
}
