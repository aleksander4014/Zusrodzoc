import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6] p-6 text-[#111C18]">
          <div className="max-w-lg w-full rounded-xl border border-[#FCA5A5] bg-white p-6 space-y-3">
            <h1 className="text-lg font-bold text-[#991B1B]">
              Wystąpił błąd renderowania aplikacji
            </h1>
            <p className="text-sm text-[#4B5E55]">
              {this.state.error.message || 'Nieznany błąd po stronie przeglądarki.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#007834] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005E28]"
            >
              Odśwież aplikację
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
