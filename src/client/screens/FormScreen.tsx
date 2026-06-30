import { useEffect, useRef, useState, useCallback } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppContext } from '../context/AppStateContext';
import { renderComposedPhoto, imageDataToBase64Sync } from '../utils/canvas';
import { savePhoto } from '../api/photobooth';
import type { UserData } from '../types';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const commaIndex = base64.indexOf(',');
      resolve(commaIndex !== -1 ? base64.substring(commaIndex + 1) : base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function FormScreen() {
  const { state, capturedImages, filteredImages, doodledImages, sessionVideo, goTo, dispatch, showToast } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState('');
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canvasRef.current && capturedImages.current.length > 0) {
      const displayImages = state.doodleEnabled && doodledImages.current.length > 0
        ? doodledImages.current
        : filteredImages.current;
      renderComposedPhoto(
        canvasRef.current,
        displayImages,
        state.selectedTemplate || 'frame1'
      );
    }
  }, []);

  const handleKey = useCallback(
    (char: string) => {
      if (!activeInput) return;
      const setter = {
        name: setName,
        wa: setWa,
        email: setEmail,
      }[activeInput];
      if (!setter) return;

      if (char === '⌫') {
        setter((v) => v.slice(0, -1));
      } else if (char === 'SPACE') {
        setter((v) => v + ' ');
      } else if (char === 'CLEAR') {
        setter('');
      } else {
        setter((v) => v + char);
      }
    },
    [activeInput]
  );

  const doSubmit = async (userData: UserData) => {
    if (loading) return;
    setLoading(true);

    const composedBase64 = canvasRef.current
      ? canvasRef.current.toDataURL('image/jpeg', 0.9)
      : '';
    const rawBase64s = capturedImages.current.map(imageDataToBase64Sync);

    let videoBase64: string | undefined;
    if (sessionVideo.current) {
      try {
        videoBase64 = await blobToBase64(sessionVideo.current);
      } catch {}
    }

    try {
      const result = await savePhoto({
        composedBase64,
        photos: rawBase64s,
        userData,
        template: state.selectedTemplate || 'frame1',
        filter: state.activeFilter || 'none',
        videoBase64,
      });
      if (result.session_id) {
        dispatch({ type: 'SET_SESSION_ID', payload: result.session_id });
      }
      dispatch({ type: 'SET_PRINT_STATUS', payload: result.printed ? 'success' : 'failed' });
      goTo('print');
    } catch {
      showToast('Failed to save photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedWa = wa.trim();
    const trimmedEmail = email.trim();

    if (!trimmedWa && !trimmedEmail) {
      showToast('Please fill in either WhatsApp number or Email address, or click SKIP.');
      return;
    }

    if (trimmedWa) {
      const waRegex = /^\+?[0-9]{9,15}$/;
      if (!waRegex.test(trimmedWa)) {
        showToast('Please enter a valid WhatsApp number (digits only, 9-15 chars).');
        return;
      }
    }

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        showToast('Please enter a valid Email address.');
        return;
      }
    }

    doSubmit({ name: trimmedName, wa: trimmedWa, email: trimmedEmail });
  };

  const handleSkip = () => doSubmit({});

  const VK_ROWS = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M','@','.','⌫'],
    ['SPACE','CLEAR'],
  ];

  return (
    <section className="screen" role="main" aria-label="Contact details form">
      <ScreenHeader
        title="Get Your Soft Copy"
        step="Step 5 of 5"
        onBack={() => goTo('filter')}
      />
      <div className="form-layout">
        <div className="form-preview-wrap">
          <canvas ref={canvasRef} id="form-canvas" aria-label="Composed photo preview" />
        </div>
        <div className="form-fields">
          <p className="form-subtitle" id="form-instruction">
            Fill in your details to receive a digital copy — or skip to print
            right away.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} aria-labelledby="form-instruction">
            <div className="field-group">
              <label htmlFor="input-name">Your Name</label>
              <input
                id="input-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setActiveInput('name')}
                placeholder="e.g. Sari Dewi"
                autoComplete="name"
                aria-required="false"
              />
            </div>
            <div className="field-group">
              <label htmlFor="input-wa">WhatsApp Number</label>
              <input
                id="input-wa"
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                onFocus={() => setActiveInput('wa')}
                placeholder="e.g. 08123456789"
                autoComplete="tel"
                inputMode="numeric"
                aria-required="true"
              />
            </div>
            <div className="field-group">
              <label htmlFor="input-email">Email Address</label>
              <input
                id="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setActiveInput('email')}
                placeholder="e.g. sari@email.com"
                autoComplete="email"
                inputMode="email"
                aria-required="false"
              />
            </div>
            <div className="form-actions" style={{ marginTop: 'auto', flexDirection: 'row' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={handleSkip}
                disabled={loading}
                type="button"
                aria-label="Skip form and print directly"
              >
                [ SKIP ]
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={handleSubmit}
                disabled={loading}
                type="submit"
                aria-label={loading ? 'Saving photo' : 'Submit and print photo'}
              >
                {loading ? 'Saving...' : '[ SUBMIT & PRINT ]'}
              </button>
            </div>
          </form>
          <div className="virtual-keyboard" role="group" aria-label="Virtual keyboard" aria-controls="input-name input-wa input-email">
            {VK_ROWS.map((row, ri) => (
              <div key={ri} className="vk-row" role="presentation">
                {row.map((key) => (
                  <button
                    key={key}
                    className={`vk-key${key === 'SPACE' ? ' vk-space' : ''}${key === '⌫' ? ' vk-backspace' : ''}`}
                    onClick={() => handleKey(key)}
                    aria-label={key === '⌫' ? 'Backspace' : key === 'SPACE' ? 'Space' : key === 'CLEAR' ? 'Clear field' : key === '.' ? 'Period' : key}
                    type="button"
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
