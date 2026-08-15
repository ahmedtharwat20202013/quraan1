import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MuslimBag ErrorBoundary] Uncaught runtime exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen w-full bg-[#011209] text-white flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full p-8 rounded-[2.5rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/40 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gold-accent/10 border border-gold-accent/30 text-gold-accent flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gold-accent tracking-tight">تطبيق حقيبة المسلم</h2>
              <p className="text-xs text-white/70 font-bold leading-relaxed">
                حدث تنبيه بسيط أثناء التحميل. اضغط على الزر أدناه لإعادة تشغيل التطبيق بنجاح.
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FFE259] via-[#D4AF37] to-[#FFA751] text-emerald-950 font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={18} />
              <span>إعادة تشغيل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
