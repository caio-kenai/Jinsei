import { describe, expect, it } from 'vitest';
import {
  credentialsSchema,
  onboardingSchema,
  preferencesPatchSchema,
} from '../../packages/contracts/src';

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
