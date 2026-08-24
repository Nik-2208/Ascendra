"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
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
    console.error("Uncaught Error in ASCENDRA ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white font-sans text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E74C3C]/20 border border-[#E74C3C]/40 flex items-center justify-center mb-4 text-[#E74C3C] shadow-[0_0_20px_rgba(231,76,60,0.3)]">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Realm Anomaly Encountered</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while rendering the current interface. Your character progress is safe in the realm vault.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6D5EF8] to-[#5546E0] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-[0_0_15px_rgba(109,94,248,0.4)]"
          >
            <RefreshCw size={16} /> Reload Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
