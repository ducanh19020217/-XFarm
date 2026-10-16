import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';

export function sanitizeAuditData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditData);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        /pass|token|secret|authorization/i.test(key) ? '***' : sanitizeAuditData(nestedValue),
      ]),
    );
  }

  return value;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, params, body, user } = request;

    if (originalUrl.startsWith('/api/v1/auth/')) {
      return next.handle();
    }

    // Only audit mutating methods: POST, PATCH, PUT, DELETE
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    if (!mutatingMethods.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            // Find user ID
            const resObj = responseData as Record<string, unknown> | undefined;
            const resUser = resObj?.user as Record<string, unknown> | undefined;
            const resData = resObj?.data as Record<string, unknown> | undefined;
            const userId = (user?.id as string) || (resUser?.id as string) || null;
            if (!userId) {
              return;
            }

            // Derive entity from URL e.g. /api/v1/users/abc -> entity: users
            const segments = originalUrl.replace(/^\/api\/v\d+\//, '').split('/');
            const entity = segments[0] || 'unknown';
            const entityId = params?.id || resObj?.id || resData?.id || 'none';

            // Sanitize sensitive fields from diff
            const sanitizedBody = sanitizeAuditData(body);

            await prisma.auditLog.create({
              data: {
                userId,
                action: method,
                entity,
                entityId: String(entityId),
                diff: {
                  url: originalUrl,
                  body: sanitizedBody as Prisma.InputJsonValue,
                },
              },
            });
          } catch (err) {
            this.logger.error('Failed to write audit log', err);
          }
        },
      }),
    );
  }
}
