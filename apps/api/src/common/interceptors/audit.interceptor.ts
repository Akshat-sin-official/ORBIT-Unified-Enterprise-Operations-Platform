import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only audit mutation methods
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = (request as any).user;
    const path = request.url;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string) || request.ip || 'unknown';

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            if (user?.organizationId) {
              const entityType = this.extractEntityType(path);
              const entityId =
                data?.id || request.params?.id || 'unknown';

              await this.prisma.auditLog.create({
                data: {
                  organizationId: user.organizationId,
                  actorId: user.id || null,
                  action: `${method} ${path}`,
                  entityType,
                  entityId: String(entityId),
                  metadata: {
                    body: this.sanitizePayload(request.body),
                    statusCode: context.switchToHttp().getResponse().statusCode,
                  },
                  ipAddress,
                },
              });
            }
          } catch (err: any) {
            this.logger.warn(`Failed to write audit log: ${err.message}`);
          }
        },
        error: (err) => {
          this.logger.debug(`Audit: mutation failed with error ${err.message}`);
        },
      }),
    );
  }

  private extractEntityType(path: string): string {
    const parts = path.split('?')[0].split('/').filter(Boolean);
    // e.g. /api/v1/users/123 -> users
    const apiIndex = parts.indexOf('v1') !== -1 ? parts.indexOf('v1') + 1 : parts.indexOf('api') + 1;
    return parts[apiIndex] || 'system';
  }

  private sanitizePayload(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
