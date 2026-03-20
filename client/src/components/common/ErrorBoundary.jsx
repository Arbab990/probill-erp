import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md px-4">
                        <div className="text-5xl">⚠️</div>
                        <h1 className="font-display font-bold text-xl text-slate-100">Something went wrong</h1>
                        <p className="text-slate-400 font-body text-sm">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-body hover:bg-primary/80 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;