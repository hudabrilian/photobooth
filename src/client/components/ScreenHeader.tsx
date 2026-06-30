interface ScreenHeaderProps {
  title: string;
  step: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, step, onBack }: ScreenHeaderProps) {
  return (
    <header className="screen-header" role="banner">
      {onBack && (
        <button
          className="btn-back"
          onClick={onBack}
          aria-label={`Go back from ${title}`}
        >
          ← Back
        </button>
      )}
      <h1 className="screen-title">{title}</h1>
      <div className="step-indicator" aria-label={`Step ${step}`}>{step}</div>
    </header>
  );
}
