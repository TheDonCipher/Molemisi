import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Audit logging interceptor.
 *
 * Logs all economic mutations (POST/PUT/PATCH/DELETE) for auditability.
 * This is a defense-in-depth measure — the game_ledger_entries table
 * provides the authoritative audit trail, but these logs help with
 * real-time debugging and incident response.
 *
 * Sensitive data (passwords, tokens, payment credentials) is never logged.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const userId = (user as { sub?: string })?.sub || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} user=${userId} duration=${duration}ms status=OK`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} user=${userId} duration=${duration}ms status=ERROR: ${error.message}`,
          );
        },
      }),
    );
  }
}
