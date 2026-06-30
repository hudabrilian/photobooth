import { useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppStateContext';
import { generateTestImages } from '../utils/testData';

export function IdleScreen() {
  const { goTo, dispatch, capturedImages } = useAppContext();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleTestMode = useCallback(() => {
    capturedImages.current = generateTestImages(3);
    dispatch({ type: 'SELECT_TEMPLATE', payload: 'frame1' });
    dispatch({ type: 'SET_PHOTOS_NEEDED', payload: 3 });
    dispatch({ type: 'SET_CAPTURED_COUNT', payload: 3 });
    goTo('filter');
  }, [dispatch, capturedImages, goTo]);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    tapCount.current++;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);
    if (tapCount.current >= 4) {
      tapCount.current = 0;
      handleTestMode();
    }
  }, [handleTestMode]);

  return (
    <section
      className="screen"
      role="main"
      aria-label="Home screen"
      onClick={() => goTo('payment')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo('payment'); } }}
      tabIndex={0}
    >
      <div className="idle-bg-grid" aria-hidden="true" />
      <div className="idle-content">
        <div className="idle-logo" onClick={handleLogoClick} role="button" aria-label="SnapBooth logo (tap 4 times for test mode)" tabIndex={-1}>
          <img src="assets/logo.png" alt="SnapBooth" />
        </div>
        <p className="idle-tagline" aria-label="Tagline: Orbit of Your Best Moments">Orbit of Your Best Moments.</p>
        <div className="tap-prompt" aria-hidden="true">
          <span className="tap-ring" />
          <span className="tap-ring tap-ring--2" />
          <span className="tap-dot" />
        </div>
        <p className="tap-label" role="status" aria-live="polite">TAP ANYWHERE TO BEGIN</p>
      </div>
    </section>
  );
}
