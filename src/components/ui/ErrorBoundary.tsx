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
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h1 className="text-xl font-bold">앱 오류가 발생했어요</h1>
          <p className="mt-2 text-sm text-white/70">
            아래 에러 메시지를 복사해서 보내주면 원인 바로 잡을게요.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/60 p-4 text-xs text-red-200">
            {String(this.state.error.stack || this.state.error.message)}
          </pre>
          <button
            type="button"
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
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

