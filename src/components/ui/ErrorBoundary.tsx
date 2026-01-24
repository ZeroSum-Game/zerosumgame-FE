import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep it in console for debugging even if the UI is blanked.
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="ui-page p-6">
        <div className="ui-bg-blobs" aria-hidden="true">
          <div className="ui-blob -left-24 -top-24 bg-red-500/10" />
          <div className="ui-blob -right-28 -bottom-28 bg-amber-400/10" />
        </div>

        <div className="ui-card relative z-10 mx-auto max-w-3xl">
          <h1 className="text-xl font-bold">앱 오류가 발생했어요</h1>
          <p className="mt-2 text-sm text-white/70">
            아래 에러 메시지를 복사해서 보내주면 원인 바로 잡을게요.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/60 p-4 text-xs text-red-200">
            {String(this.state.error.stack || this.state.error.message)}
          </pre>
          <button
            type="button"
            className="ui-btn ui-btn-secondary mt-4 px-4 py-2 text-sm font-semibold"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
