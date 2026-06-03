import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onClose?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-[var(--card)] p-6 shadow-lg">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h3>
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              {this.props.fallbackMessage ?? "An unexpected error occurred while rendering this view."}
            </p>
            {this.props.onClose && (
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onClose?.();
                }}
                className="rounded-md border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
              >
                Close
              </button>
            )}
            {this.props.onReset && !this.props.onClose && (
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onReset?.();
                }}
                className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
