import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(`[ErrorBoundary] ${this.props.label || 'Component'} crashed:`, error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center border-rose-500/20">
                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">
                            {this.props.label || 'Section'} Error
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-xs">
                            Something went wrong rendering this section. Other parts of the app are unaffected.
                        </p>
                    </div>
                    {this.state.error && (
                        <p className="text-[10px] font-mono text-rose-400/60 bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-500/10 max-w-md truncate">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={this.handleReset}
                        className="mt-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
