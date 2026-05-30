"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

export class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ClientErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-neutral-600">
            This section hit an unexpected error. You can try again or return
            home.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-black px-4 py-2 text-sm text-white"
              onClick={this.handleRetry}
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
