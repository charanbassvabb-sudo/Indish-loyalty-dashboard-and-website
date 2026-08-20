import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw, UtensilsCrossed } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch-all for render/lifecycle errors anywhere in the tree.
 * Without this, an uncaught error in any component unmounts the entire React
 * tree and leaves a blank white page — no message, no way back, and (worse)
 * no record of what happened. This renders an on-brand fallback instead and
 * logs the error, which is also the hook point for wiring up an error
 * reporting service (e.g. Sentry) later without touching call sites.
 *
 * Note: this only catches errors during render/lifecycle, per React's rules
 * — it can't catch errors in event handlers or async code (those are
 * already handled locally via try/catch + toasts throughout the app).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-card shadow-warm">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">
            Something went wrong in the kitchen
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            This wasn't your fault — an unexpected error interrupted the page. Reloading usually fixes it; if it
            keeps happening, please call the branch directly so we can help right away.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-ember shadow-warm flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload the page
          </button>
          <a
            href="/"
            className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Back to Indish
          </a>
        </div>
      </div>
    );
  }
}
