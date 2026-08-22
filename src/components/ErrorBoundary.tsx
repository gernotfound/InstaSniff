import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('InstaSniff Uncaught Exception in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle size={24} />
            </div>
            
            <h2 className="text-xl font-bold text-white">Si è verificato un errore imprevisto</h2>
            
            <p className="text-sm text-slate-400">
              L&apos;applicazione ha riscontrato un problema durante l&apos;elaborazione dei dati.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-32 text-xs font-mono text-red-300">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
              >
                Riprova
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
              >
                <RefreshCw size={16} />
                Ricarica Pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
