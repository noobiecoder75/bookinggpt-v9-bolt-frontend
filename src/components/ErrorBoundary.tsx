import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary caught an error:', error);
    
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary componentDidCatch:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Log to external service if available
    if (typeof window !== 'undefined') {
      console.group('🚨 CRITICAL ERROR - App Failed to Render');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Stack:', error.stack);
      console.groupEnd();
    }
  }

  handleRefresh = () => {
    console.log('🔄 User triggered app refresh from error boundary');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      console.warn('🚨 ErrorBoundary rendering error UI');
      
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-red-900 mb-4">
              Oops! Something went wrong
            </h1>
            
            <p className="text-red-700 mb-6 leading-relaxed">
              The application encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>

            <div className="space-y-4">
              <button
                onClick={this.handleRefresh}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800 font-medium">
                  Show Technical Details
                </summary>
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-800 font-mono">
                    <strong>Error:</strong> {this.state.error?.message}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="text-xs text-red-700 mt-2 overflow-auto max-h-32 font-mono">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            </div>

            <div className="mt-6 pt-6 border-t border-red-200">
              <p className="text-xs text-red-600">
                Error ID: {Date.now().toString(36)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('🚨 useErrorHandler caught error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  };

  return handleError;
};

export default ErrorBoundary;