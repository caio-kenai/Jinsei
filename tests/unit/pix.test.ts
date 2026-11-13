import { describe, expect, it } from 'vitest';
import { crc16, validPixPayload } from '../../apps/api/src/modules/support/pix';

describe('integridade do payload Pix', () => {
  it('confere o vetor padrão CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
  it('valida o conteúdo exato e recusa alterações', () => {
    const content = '00020126180014BR.GOV.BCB.PIX6304';
    const payload = content + crc16(content);
    expect(validPixPayload(payload)).toBe(true);
    expect(validPixPayload(payload.replace('2618', '2619'))).toBe(false);
    expect(validPixPayload('')).toBe(false);
  });
});
