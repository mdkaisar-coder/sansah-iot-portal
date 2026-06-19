import React from 'react';
import { ShieldAlert, RefreshCw, Database, Terminal, FileCode } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an uncaught rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060B16] text-[#F9FAFB] flex items-center justify-center p-4 font-sans selection:bg-primary/30">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10 pointer-events-none"></div>
          
          <div className="w-full max-w-2xl bg-[#111827] border border-[#EF4444]/25 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden">
            {/* Warning Glow Header */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#EF4444] to-transparent"></div>
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl glow-red">
                <ShieldAlert className="w-10 h-10 text-[#EF4444]" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-wide uppercase">System Disruption</h1>
                <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
                  An unexpected application thread exception occurred. The portal subsystem had to suspend execution.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center w-full">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563eb] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Application</span>
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 bg-[#0B1220] hover:bg-[#1e293b] text-[#F9FAFB] font-medium text-sm px-5 py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer border border-[#1F2937]"
                >
                  <Database className="w-4 h-4 text-[#F59E0B]" />
                  <span>Clear Cache & Reset</span>
                </button>
              </div>

              {/* Diagnostics Collapsible Section */}
              <div className="w-full text-left bg-[#0B1220] border border-[#1F2937] rounded-xl overflow-hidden">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e293b]/40 transition-all text-xs font-semibold text-[#94A3B8] cursor-pointer select-none border-b border-[#1F2937]"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span>DIAGNOSTIC TELEMETRY</span>
                  </div>
                  <span>{this.state.showDetails ? 'COLLAPSE' : 'EXPAND'}</span>
                </button>

                {this.state.showDetails && (
                  <div className="p-4 font-mono text-[11px] text-[#EF4444]/90 space-y-4 max-h-[300px] overflow-y-auto">
                    <div className="flex gap-2">
                      <FileCode className="w-4 h-4 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">Exception Stack:</span>
                        <pre className="mt-1.5 whitespace-pre-wrap leading-relaxed text-[#94A3B8]">
                          {this.state.error ? this.state.error.stack : 'No stack details available.'}
                        </pre>
                      </div>
                    </div>
                    {this.state.errorInfo && (
                      <div className="border-t border-[#1F2937]/50 pt-3">
                        <span className="font-semibold text-white">Component Trace:</span>
                        <pre className="mt-1.5 whitespace-pre-wrap leading-relaxed text-[#94A3B8]">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
