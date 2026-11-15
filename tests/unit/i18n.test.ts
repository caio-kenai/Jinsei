import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as contracts from '../../packages/contracts/src';
import { matchLocale, translator } from '../../apps/web/src/i18n/config';
import { en } from '../../apps/web/src/i18n/messages/en';
import { es } from '../../apps/web/src/i18n/messages/es';

const source = join(__dirname, '../../apps/web/src');
const call = /\b(?:t|msg|translate)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'messages' ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function sourceKeys() {
  const keys = new Set<string>();
  for (const file of files(source)) {
    for (const match of readFileSync(file, 'utf8').matchAll(call)) {
      const text = match[1] ?? match[2]!;
      keys.add(text.replace(/\\(['"])/g, '$1').replace(/\\\\/g, '\\'));
    }
  }
  // Label maps from the contracts are rendered with t(map[key]).
  for (const [name, value] of Object.entries(contracts)) {
    if (!/Labels$/.test(name) || name === 'localeLabels') continue;
    for (const label of Object.values(value as Record<string, string>)) keys.add(label);
  }
  for (const units of Object.values(contracts.goalUnits)) for (const unit of units) keys.add(unit);
  return [...keys];
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Traduções da interface', () => {
  const keys = sourceKeys();

  it.each([
    ['en', en],
    ['es', es],
  ])('o catálogo %s cobre todos os textos marcados', (_, catalog) => {
    expect(keys.filter((key) => !(key in catalog))).toEqual([]);
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('o catálogo %s mantém as mesmas variáveis', (_, catalog) => {
    const broken = Object.entries(catalog).filter(
      ([key, value]) => placeholders(key).join() !== placeholders(value).join(),
    );
    expect(broken).toEqual([]);
  });

  it('traduz com variáveis e usa o português como reserva', () => {
    expect(translator('en')('Capa de {title}', { title: 'Outer Wilds' })).toBe(
      'Cover of Outer Wilds',
    );
    expect(translator('es')('Texto que ainda não existe')).toBe('Texto que ainda não existe');
    expect(translator('pt-BR')('Ver todas as {count} sessões', { count: 3 })).toBe(
      'Ver todas as 3 sessões',
    );
  });

  it('escolhe o idioma pelo cabeçalho do navegador', () => {
    expect(matchLocale('en-GB,en;q=0.9')).toBe('en');
    expect(matchLocale('es-MX')).toBe('es');
    expect(matchLocale('pt-PT')).toBe('pt-BR');
    expect(matchLocale('fr-FR')).toBe('pt-BR');
    expect(matchLocale(undefined)).toBe('pt-BR');
  });
});
