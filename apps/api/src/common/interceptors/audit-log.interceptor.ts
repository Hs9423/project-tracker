import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async () => {
        if (!user) return;
        const method = request.method;
        if (!['POST', 'PATCH', 'DELETE'].includes(method)) return;

        await this.prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: `${method.toLowerCase()}.${context.getClass().name}`,
            entityType: context.getClass().name,
            metadata: { body: request.body, params: request.params },
          },
        });
      }),
    );
  }
}
