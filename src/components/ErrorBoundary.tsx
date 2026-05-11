import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <h2 className="text-xl font-black text-red-600 mb-2">抱歉，系統發生未預期的錯誤</h2>
            <p className="text-slate-600 text-sm mb-4">
              您可以嘗試重新整理頁面，或者聯絡系統管理員。
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-auto max-h-40">
              <pre className="text-[10px] text-slate-500 font-mono">
                {this.state.error?.message}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
