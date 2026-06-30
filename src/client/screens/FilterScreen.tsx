import { useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppContext } from '../context/AppStateContext';
import { renderComposedPhoto } from '../utils/canvas';
import { FILTER_OPTIONS } from '../types';
import { applySmartDoodles } from '../photo_processing/doodle/engine';

export function FilterScreen() {
  const { state, capturedImages, filteredImages, doodledImages, applyFilter, goTo, dispatch } =
    useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingDoodles, setLoadingDoodles] = useState(false);

  const renderPreview = async () => {
    if (!canvasRef.current || capturedImages.current.length === 0) return;

    let sourceImages = filteredImages.current;

    if (state.doodleEnabled) {
      if (doodledImages.current.length !== sourceImages.length) {
        setLoadingDoodles(true);
        try {
          const processed: ImageData[] = [];
          for (const img of sourceImages) {
            const res = await applySmartDoodles(img, {
              themeId: state.selectedDoodleTheme,
            });
            processed.push(res);
          }
          doodledImages.current = processed;
        } catch (err) {
          console.error('Doodle processing failed:', err);
        } finally {
          setLoadingDoodles(false);
        }
      }
      sourceImages = doodledImages.current;
    }

    renderComposedPhoto(
      canvasRef.current,
      sourceImages,
      state.selectedTemplate || 'frame1'
    );
  };

  useEffect(() => {
    if (capturedImages.current.length > 0) {
      if (filteredImages.current.length === 0) {
        filteredImages.current = [...capturedImages.current];
      }
      renderPreview();
    }
  }, [state.doodleEnabled, state.selectedDoodleTheme]);

  const handleFilter = async (filterName: string) => {
    applyFilter(filterName);
    await renderPreview();
  };

  const handleDoodleToggle = (enabled: boolean) => {
    dispatch({ type: 'TOGGLE_DOODLES', payload: enabled });
  };

  const handleDoodleTheme = (theme: string) => {
    doodledImages.current = [];
    dispatch({ type: 'SET_DOODLE_THEME', payload: theme });
  };

  const handleNext = () => {
    goTo('form');
  };

  return (
    <section className="screen" role="main" aria-label="Filter selection">
      <ScreenHeader
        title="Choose a Filter"
        step="Step 4 of 5"
        onBack={() => goTo('capture')}
      />
      <div className="filter-layout">
        <div className="filter-preview-wrap" style={{ position: 'relative' }}>
          <canvas ref={canvasRef} id="filter-canvas" aria-label="Photo preview with filter" />
          {loadingDoodles && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              fontFamily: 'var(--font-display)',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              border: '2px solid var(--border)',
              zIndex: 10
            }}>
              <span>Generating Doodles...</span>
            </div>
          )}
        </div>
        <div className="filter-options" role="radiogroup" aria-label="Photo filters" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`filter-btn${state.activeFilter === opt.id ? ' active' : ''}`}
              data-filter={opt.id}
              onClick={() => handleFilter(opt.id)}
              role="radio"
              aria-checked={state.activeFilter === opt.id}
              aria-label={opt.label}
            >
              <span className={`filter-swatch filter-swatch--${opt.id}`} aria-hidden="true" />
              {opt.label}
            </button>
          ))}

          {/* Smart Doodle Control Section */}
          <div className="doodle-control-section" style={{ borderTop: '2px dashed var(--border)', marginTop: 24, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <input
                type="checkbox"
                id="doodle-toggle"
                checked={state.doodleEnabled}
                onChange={(e) => handleDoodleToggle(e.target.checked)}
                style={{ width: 24, height: 24, accentColor: 'var(--border)', cursor: 'pointer' }}
              />
              <label htmlFor="doodle-toggle" style={{ fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Smart Doodles
              </label>
            </div>

            {state.doodleEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Theme Selector:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['auto', 'korean', 'retro', 'birthday', 'summer', 'christmas'].map((theme) => (
                    <button
                      key={theme}
                      className={`filter-btn${state.selectedDoodleTheme === theme ? ' active' : ''}`}
                      onClick={() => handleDoodleTheme(theme)}
                      style={{ padding: '8px 16px', fontSize: '0.9rem', minHeight: 44 }}
                    >
                      {theme.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <button className="btn-primary btn-large" onClick={handleNext} aria-label="Continue with selected filter">
        Use This Look →
      </button>
    </section>
  );
}
