import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', whiteSpace: 'pre-wrap' }}>
          <h2>Something went wrong.</h2>
          <details>
            <summary>Click for error details</summary>
            {this.state.error?.toString()}
            <br />
            {Boolean(import.meta.env.DEV) && this.state.error?.stack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

