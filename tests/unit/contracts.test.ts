import { describe, expect, it } from 'vitest';
import {
  credentialsSchema,
  onboardingSchema,
  preferencesPatchSchema,
  entryCreateSchema,
  entryPatchSchema,
  savedViewConfigSchema,
  defaultViewConfig,
} from '../../packages/contracts/src';

describe('Contratos da biblioteca', () => {
  it('exige uma única origem para a obra', () => {
    expect(entryCreateSchema.safeParse({}).success).toBe(false);
    expect(entryCreateSchema.safeParse({ mediaId: '1', media: { title: 'Teste' } }).success).toBe(
      false,
    );
    expect(entryCreateSchema.safeParse({ media: { title: 'Teste' } }).success).toBe(true);
  });
  it('valida meios pontos e limites de progresso', () => {
    expect(
      entryCreateSchema.safeParse({ media: { title: 'Teste', coverUrl: 'javascript:alert(1)' } })
        .success,
    ).toBe(false);
    expect(
      entryCreateSchema.safeParse({
        media: { title: 'Teste', coverUrl: 'https://example.com/cover.jpg' },
      }).success,
    ).toBe(true);
    expect(entryPatchSchema.parse({ rating: 9.5 })).toEqual({ rating: 9.5 });
    expect(preferencesPatchSchema.parse({ theme: 'dark' })).toEqual({ theme: 'dark' });
    expect(entryPatchSchema.safeParse({ rating: 9.5 }).success).toBe(true);
    for (const rating of [-1, 10.5, 9.3])
      expect(entryPatchSchema.safeParse({ rating }).success).toBe(false);
    expect(
      entryPatchSchema.safeParse({ progress: { hoursPlayed: 1, completion: 101 } }).success,
    ).toBe(false);
  });
  it('versiona as visualizações e preserva a coluna de título', () => {
    expect(savedViewConfigSchema.safeParse(defaultViewConfig).success).toBe(true);
    expect(savedViewConfigSchema.safeParse({ ...defaultViewConfig, version: 2 }).success).toBe(
      false,
    );
    expect(
      savedViewConfigSchema.safeParse({ ...defaultViewConfig, columns: ['rating'] }).success,
    ).toBe(false);
  });
});

describe('Contratos de identidade', () => {
  it('normaliza o e-mail sem alterar a senha', () => {
    const input = credentialsSchema.parse({
      email: 'Caio@Example.com',
      password: 'Senha longa 123',
    });
    expect(input.email).toBe('caio@example.com');
    expect(input.password).toBe('Senha longa 123');
  });
  it('rejeita senhas fracas e tentativa de definir o proprietário', () => {
    expect(credentialsSchema.safeParse({ email: 'a@example.com', password: '123' }).success).toBe(
      false,
    );
    expect(preferencesPatchSchema.safeParse({ userId: 'another-user' }).success).toBe(false);
  });
  it('rejeita categorias repetidas e nomes de usuário inválidos', () => {
    const input = { displayName: 'Teste', username: 'teste', categories: ['games'], theme: 'dark' };
    expect(onboardingSchema.safeParse(input).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...input, categories: ['games', 'games'] }).success).toBe(
      false,
    );
    expect(onboardingSchema.safeParse({ ...input, username: '../admin' }).success).toBe(false);
  });
});
