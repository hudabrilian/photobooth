import type { SavePhotoResponse, SavePhotoPayload, SessionData } from '../types';

export async function savePhoto(
  payload: SavePhotoPayload
): Promise<SavePhotoResponse> {
  const response = await fetch('/api/save-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json();
}

export async function fetchSession(sessionId: string): Promise<SessionData> {
  const response = await fetch(`/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  const body = await response.json();
  if (!body.success || !body.data) {
    throw new Error(body.message || 'Session not found');
  }

  return body.data as SessionData;
}
