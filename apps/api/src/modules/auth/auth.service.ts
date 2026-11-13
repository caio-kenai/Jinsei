import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { mediaTypes, type Credentials } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { tokenHash } from './session.guard';

export const initialStatuses = [
  { key: 'planned', label: 'Planejado', color: 'slate' },
  { key: 'in_progress', label: 'Em andamento', color: 'violet' },
  { key: 'paused', label: 'Pausado', color: 'amber' },
  { key: 'completed', label: 'Concluído', color: 'emerald' },
  { key: 'dropped', label: 'Abandonado', color: 'rose' },
];
export const hashPassword = (password: string) =>
  hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async register(input: Credentials) {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.db.user.create({
        data: {
          email: input.email,
          passwordHash,
          profile: { create: {} },
          preference: { create: {} },
          categories: {
            create: mediaTypes.map((mediaTypeId, sortOrder) => ({ mediaTypeId, sortOrder })),
          },
          statuses: {
            create: mediaTypes.flatMap((mediaTypeId) =>
              initialStatuses.map((status, sortOrder) => ({ ...status, mediaTypeId, sortOrder })),
            ),
          },
        },
      });
      return this.createSession(user.id);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002')
        throw new ConflictException('Não foi possível criar a conta com os dados informados');
      throw error;
    }
  }

  async login(input: Credentials) {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    const valid = await verify(user?.passwordHash ?? (await this.dummyHash), input.password);
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha incorretos');
    return this.createSession(user.id);
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 86400000);
    await this.db.$transaction([
      this.db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
      this.db.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } }),
    ]);
    return { token, expiresAt, userId };
  }
}
