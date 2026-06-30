import { useRef, useCallback, useState } from 'react';

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    stop();
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      return stream;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setError(msg);
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  return { start, stop, error, streamRef };
}
