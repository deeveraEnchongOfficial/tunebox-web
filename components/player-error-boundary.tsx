'use client';

import * as React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class PlayerErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    console.error('Player error:', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-4 text-center text-sm text-muted-foreground">
          Playback error. Try playing another track.
        </div>
      );
    }
    return this.props.children;
  }
}
