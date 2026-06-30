import { useRef, useEffect, useState, useCallback } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppContext } from '../context/AppStateContext';
import { useCamera } from '../hooks/useCamera';
import { captureFrame } from '../utils/canvas';

export function CaptureScreen() {
  const { state, dispatch, capturedImages, goTo, sessionVideo } = useAppContext();
  const { start, stop, error } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shutterDisabled, setShutterDisabled] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    start().then((stream) => {
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          chunksRef.current = [];
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm',
            videoBitsPerSecond: 2500000,
          });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch {}
      }
    });
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      stop();
    };
  }, [start, stop]);

  const currentPhoto = state.capturedCount + 1;

  const handleShutter = useCallback(() => {
    setShutterDisabled(true);
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;

    let timer: ReturnType<typeof setTimeout>;

    if (countdown === 0) {
      timer = setTimeout(() => {
        setCountdown(null);
        if (videoRef.current && reviewCanvasRef.current) {
          const imgData = captureFrame(videoRef.current, reviewCanvasRef.current);
          capturedImages.current.push(imgData);
          dispatch({ type: 'INCREMENT_CAPTURED' });
          setReviewing(true);
          setShutterDisabled(false);
        }
      }, 500);
    } else {
      timer = setTimeout(() => setCountdown((c) => (c as number) - 1), 1000);
    }

    return () => clearTimeout(timer);
  }, [countdown, dispatch, capturedImages]);

  const handleRetake = () => {
    capturedImages.current.pop();
    dispatch({ type: 'SET_CAPTURED_COUNT', payload: state.capturedCount - 1 });
    setReviewing(false);
    videoRef.current?.play();
  };

  const handleKeep = useCallback(() => {
    setReviewing(false);
    if (state.capturedCount >= state.photosNeeded) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          sessionVideo.current = blob;
          stop();
          goTo('filter');
        };
        mediaRecorderRef.current.stop();
      } else {
        stop();
        goTo('filter');
      }
    } else {
      videoRef.current?.play();
      setShutterDisabled(true);
      setCountdown(3);
    }
  }, [state.capturedCount, state.photosNeeded, stop, goTo, sessionVideo]);

  useEffect(() => {
    if (!reviewing) {
      setReviewCountdown(null);
      return;
    }
    setReviewCountdown(3);
  }, [reviewing]);

  useEffect(() => {
    if (reviewCountdown === null) return;

    if (reviewCountdown <= 0) {
      handleKeep();
      return;
    }

    const timer = setTimeout(() => {
      setReviewCountdown((c) => (c as number) - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [reviewCountdown, handleKeep]);

  return (
    <section className="screen" role="main" aria-label="Photo capture">
      <ScreenHeader
        title="Strike a Pose!"
        step={`Photo ${Math.min(currentPhoto, state.photosNeeded)} of ${state.photosNeeded}`}
        onBack={() => { stop(); goTo('template'); }}
      />
      <div className="capture-stage">
        <div className="video-wrapper">
          <video
            ref={videoRef}
            id="camera-feed"
            autoPlay
            playsInline
            muted
            aria-label="Camera feed"
            style={{ display: error ? 'none' : 'block' }}
          />
          <canvas
            ref={reviewCanvasRef}
            className={reviewing ? '' : 'hidden'}
            aria-label="Captured photo preview"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
          {countdown !== null && (
            <div className="countdown-overlay" role="status" aria-live="assertive" aria-label={`Capturing in ${countdown}`}>
              <span id="countdown-number">{countdown}</span>
            </div>
          )}
          {error && <div className="camera-error" role="alert">{error}</div>}
        </div>
      </div>

      {!reviewing ? (
        <div className="capture-controls">
          <button
            className="btn-shutter"
            onClick={handleShutter}
            disabled={shutterDisabled}
            aria-label="Take photo"
          >
            <span className="shutter-inner" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className="capture-controls"
          style={{ flexDirection: 'row', gap: 20 }}
        >
          <button className="btn-secondary" onClick={handleRetake} aria-label="Retake photo">
            Retake
          </button>
          <button className="btn-primary" onClick={handleKeep} aria-label={state.capturedCount >= state.photosNeeded ? 'All done, proceed to filters' : 'Keep and take next photo'}>
            {state.capturedCount >= state.photosNeeded
              ? `All Done! ${reviewCountdown !== null ? `(${reviewCountdown}s)` : ''} →`
              : `Keep & Next ${reviewCountdown !== null ? `(${reviewCountdown}s)` : ''} →`}
          </button>
        </div>
      )}
    </section>
  );
}
