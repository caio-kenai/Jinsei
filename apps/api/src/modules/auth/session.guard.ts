import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export const SESSION_COOKIE = 'jinsei_session';
export const Public = () => SetMetadata('public', true);
export type AuthenticatedRequest = Request & { userId: string; sessionId: string };
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookie = (request.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE];
    if (typeof cookie !== 'string' || !/^[a-f0-9]{64}$/.test(cookie))
      throw new UnauthorizedException('Entre na sua conta para continuar');
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(cookie) },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente');
    request.userId = session.userId;
    request.sessionId = session.id;
    return true;
  }
}
