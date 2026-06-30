import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: 'error',
        message: error.message || 'React render crash',
        error: {
          stack: error.stack,
          componentStack: info.componentStack,
        },
      }),
    }).catch(() => {});
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section className="screen active" style={{ justifyContent: 'center', alignItems: 'center', padding: 40, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ color: '#555', marginBottom: 24, fontSize: 14 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            className="btn-primary btn-large"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Restart App
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
