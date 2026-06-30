import { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppStateContext';
import { renderComposedPhoto } from '../utils/canvas';
import { fetchSession } from '../api/photobooth';
import { QRCodeSVG } from 'qrcode.react';
import { ScreenHeader } from '../components/ScreenHeader';
import type { SessionData } from '../types';

export function PrintScreen() {
  const { state, filteredImages, doodledImages, resetApp } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState(20);
  const [session, setSession] = useState<SessionData | null>(null);
  const [progress, setProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(true);

  const viewUrl = state.sessionId
    ? `${window.location.origin}/view/${state.sessionId}`
    : null;

  useEffect(() => {
    const tpl = state.selectedTemplate || 'frame1';
    const displayImages = state.doodleEnabled && doodledImages.current.length > 0
      ? doodledImages.current
      : filteredImages.current;
    if (canvasRef.current && displayImages.length > 0) {
      renderComposedPhoto(canvasRef.current, displayImages, tpl);
    }
    if (printCanvasRef.current && displayImages.length > 0) {
      renderComposedPhoto(printCanvasRef.current, displayImages, tpl);
    }
  }, []);

  useEffect(() => {
    if (state.sessionId) {
      fetchSession(state.sessionId).then(setSession).catch(() => {});
    }
  }, [state.sessionId]);

  useEffect(() => {
    if (countdown <= 0) {
      resetApp();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, resetApp]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsSimulating(false);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating]);

  const hasGif = session?.gif_url;
  const hasVideo = session?.video_url;

  const getProgressBar = (pct: number) => {
    const totalBlocks = 15;
    const filledBlocks = Math.round((pct / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${pct}%`;
  };

  return (
    <section className="screen print-screen" role="main" aria-label="Print status">
      <ScreenHeader title="Session Complete" step="07/07" />

      <div className="print-body">
        {/* Column 1: Photo Strip */}
        <div className="print-col-strip">
          <div className="print-preview-container">
            <h2 className="print-section-title">┌── PHOTO STRIP ──┐</h2>
            <div className="print-preview-frame">
              <canvas ref={canvasRef} id="print-canvas" aria-label="Your photo" />
            </div>
            <h2 className="print-section-title">└─────────────────┘</h2>
          </div>
        </div>

        {/* Column 2: Digital Previews */}
        <div className="print-col-digital">
          {(hasGif || hasVideo) ? (
            <div className="print-digital-container">
              <h2 className="print-section-title">┌── DIGITAL COPIES ────────────────┐</h2>
              <div className="print-media-stack-vertical">
                {hasGif && (
                  <div className="print-media-card">
                    <div className="print-media-header">GIF LOOP</div>
                    <div className="print-media-content">
                      <img src={session.gif_url} alt="Animation" className="print-media-img" />
                    </div>
                  </div>
                )}
                {hasVideo && (
                  <div className="print-media-card">
                    <div className="print-media-header">VIDEO RECORDING</div>
                    <div className="print-media-content">
                      <video src={session.video_url} autoPlay loop muted playsInline className="print-media-img" />
                    </div>
                  </div>
                )}
              </div>
              <h2 className="print-section-title">└──────────────────────────────────┘</h2>
            </div>
          ) : (
            <div className="print-digital-container">
              <h2 className="print-section-title">┌── DIGITAL COPIES ────────────────┐</h2>
              <div className="print-no-digital-placeholder">
                <p>Generating digital copies...</p>
              </div>
              <h2 className="print-section-title">└──────────────────────────────────┘</h2>
            </div>
          )}
        </div>

        {/* Column 3: Control Panel */}
        <div className="print-col-panel">
          <div className="print-panel-card printer-status-card">
            <h3 className="card-header">[ PRINTER STATUS ]</h3>
            <div className="card-body">
              {isSimulating ? (
                <div className="printing-animation">
                  <div className="blinking-status">► PRINTING IN PROGRESS...</div>
                  <pre className="progress-bar-ascii">{getProgressBar(progress)}</pre>
                </div>
              ) : (
                <div className="print-result">
                  {state.printStatus === 'success' ? (
                    <div className="status-success">
                      <div className="status-stamp">✓ PRINT SUCCESSFUL</div>
                      <p>Your physical photo is ready in the printer tray.</p>
                    </div>
                  ) : (
                    <div className="status-failed">
                      <div className="status-stamp">✗ PRINT FAILED</div>
                      <p>Something went wrong. Please ask the staff for help.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {viewUrl && (
            <div className="print-panel-card download-card">
              <h3 className="card-header">[ DIGITAL DOWNLOAD ]</h3>
              <div className="card-body qr-layout">
                <div className="qr-box">
                  <QRCodeSVG value={viewUrl} size={130} fgColor="#000000" bgColor="#ffffff" />
                </div>
                <div className="qr-instructions">
                  <p className="instruction-lead">SCAN QR CODE</p>
                  <p>To download your photo, GIF animation, and video directly to your phone.</p>
                </div>
              </div>
            </div>
          )}

          <div className="print-actions-panel">
            <div className="timeout-countdown">
              Auto-returning to home in <strong>{countdown}</strong>s
            </div>
            <button 
              className="btn-primary btn-large done-button" 
              onClick={resetApp}
              aria-label="Finish session and return to home screen"
            >
              [ Done ]
            </button>
          </div>
        </div>
      </div>

      <div id="print-only-area">
        <canvas ref={printCanvasRef} id="print-only-canvas" aria-label="Print version of photo" />
      </div>
    </section>
  );
}

