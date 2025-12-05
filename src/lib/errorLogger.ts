import apiClient from '@/lib/apiClient';

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
type ErrorType = 'client_error' | 'edge_function_error' | 'webhook_error' | 'database_error' | 'api_error';

interface LogErrorOptions {
  error_type: ErrorType;
  error_code?: string;
  error_message: string;
  error_stack?: string;
  component?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the system error logs
 */
export async function logError(options: LogErrorOptions): Promise<void> {
  try {
    await apiClient.post('/errors/log', {
      errorType: options.error_type,
      errorCode: options.error_code,
      errorMessage: options.error_message,
      errorStack: options.error_stack,
      component: options.component,
      severity: options.severity || 'error',
      metadata: options.metadata,
    });
  } catch (e) {
    // Silently fail - we don't want error logging to cause more errors
    console.error('Failed to log error:', e);
  }
}

/**
 * Log a client-side error
 */
export function logClientError(
  error: Error,
  component?: string,
  metadata?: Record<string, any>
): void {
  logError({
    error_type: 'client_error',
    error_message: error.message,
    error_stack: error.stack,
    component,
    severity: 'error',
    metadata: {
      ...metadata,
      url: window.location.href,
    },
  });
}

/**
 * Log an API error
 */
export function logApiError(
  endpoint: string,
  statusCode: number,
  errorMessage: string,
  metadata?: Record<string, any>
): void {
  logError({
    error_type: 'api_error',
    error_code: statusCode.toString(),
    error_message: errorMessage,
    component: endpoint,
    severity: statusCode >= 500 ? 'critical' : 'error',
    metadata,
  });
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandler(): void {
  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    logError({
      error_type: 'client_error',
      error_message: typeof message === 'string' ? message : 'Unknown error',
      error_stack: error?.stack,
      component: source || undefined,
      severity: 'error',
      metadata: {
        lineno,
        colno,
        url: window.location.href,
      },
    });
    return false; // Let the default handler run
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    logError({
      error_type: 'client_error',
      error_message: error?.message || 'Unhandled promise rejection',
      error_stack: error?.stack,
      severity: 'error',
      metadata: {
        url: window.location.href,
      },
    });
  };
}