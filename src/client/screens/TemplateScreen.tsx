import { ScreenHeader } from '../components/ScreenHeader';
import { useAppContext } from '../context/AppStateContext';
import { TEMPLATES, getPhotoCount } from '../types';

export function TemplateScreen() {
  const { state, dispatch, goTo } = useAppContext();

  const handleSelect = (id: string) => {
    dispatch({ type: 'SELECT_TEMPLATE', payload: id });
  };

  const handleNext = () => {
    if (!state.selectedTemplate) return;
    dispatch({ type: 'RESET_CAPTURED' });
    dispatch({
      type: 'SET_PHOTOS_NEEDED',
      payload: getPhotoCount(state.selectedTemplate),
    });
    goTo('capture');
  };

  return (
    <section className="screen" role="main" aria-label="Template selection">
      <ScreenHeader
        title="Choose Your Template"
        step="Step 2 of 5"
        onBack={state.timerStarted ? undefined : () => goTo('payment')}
      />
      <div
        className="template-grid"
        role="radiogroup"
        aria-label="Photo layout templates"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
          maxWidth: 1000,
          margin: '0 auto',
          gap: 60,
        }}
      >
        {TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            className={`template-card${state.selectedTemplate === tpl.id ? ' selected' : ''}`}
            onClick={() => handleSelect(tpl.id)}
            role="radio"
            aria-checked={state.selectedTemplate === tpl.id}
            aria-label={tpl.name}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(tpl.id); } }}
          >
            <div
              className="template-preview"
              role="img"
              aria-label={`${tpl.name} preview`}
              style={{
                background: `#f4f4f4 url(${tpl.previewUrl}) center/contain no-repeat`,
                width: '100%',
                aspectRatio: '1/2',
                border: '1px solid #ddd',
              }}
            />
            <span className="template-name">{tpl.name}</span>
          </div>
        ))}
      </div>
      <button
        className={`btn-primary btn-large${!state.selectedTemplate ? ' btn-disabled' : ''}`}
        disabled={!state.selectedTemplate}
        onClick={handleNext}
        aria-label={state.selectedTemplate ? `Continue with selected template` : 'Select a template first'}
      >
        {state.selectedTemplate
          ? `Use "${TEMPLATES.find((t) => t.id === state.selectedTemplate)?.name}" →`
          : 'Select a Template to Continue'}
      </button>
    </section>
  );
}
