import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

interface BoundaryProps {
  children: ReactNode;
  resetKey: string;
  fallback: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NexRide interface error", error, errorInfo);
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function RecoveryScreen() {
  const { t } = useTranslation();

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--brand-950)] px-6 py-16 text-white"
      role="alert"
      aria-labelledby="global-error-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,182,166,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_34%)]" />
      <section className="premium-card relative w-full max-w-xl border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </span>
        <p className="section-kicker mt-6 text-amber-300">
          {t("globalError.eyebrow")}
        </p>
        <h1 id="global-error-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("globalError.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
          {t("globalError.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="premium-button inline-flex items-center justify-center gap-2 bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("globalError.retry")}
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="premium-button inline-flex items-center justify-center gap-2 border border-white/15 bg-white/10 text-white hover:bg-white/15"
          >
            <Home className="size-4" aria-hidden="true" />
            {t("globalError.home")}
          </button>
        </div>
      </section>
    </main>
  );
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary
      resetKey={`${location.pathname}${location.search}${location.hash}`}
      fallback={<RecoveryScreen />}
    >
      {children}
    </ErrorBoundary>
  );
}
