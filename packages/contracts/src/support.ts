/**
 * Buy Me a Monster: apoio voluntário ao criador do Jinsei.
 *
 * Estes dados identificam o autor original e integram os avisos de atribuição
 * exigidos pelos termos adicionais da licença (ADDITIONAL_TERMS.md, AGPL v3, seção 7).
 * Instalações e versões modificadas devem preservá-los sem alteração.
 */
export const creatorSupport = {
  creator: 'Caio Pacifico',
  pixPayload:
    '00020126580014BR.GOV.BCB.PIX01368c08bb41-e019-4994-84a2-aaf0ce749ab85204000053039865802BR5922Caio Oliveira Pacifico6009SAO PAULO621405100rTmxm8uqz63041A7B',
  pixKey: '8c08bb41-e019-4994-84a2-aaf0ce749ab8',
} as const;

export function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function validPixPayload(value: string): boolean {
  return (
    value.startsWith('000201') &&
    value.includes('BR.GOV.BCB.PIX') &&
    /6304[0-9A-F]{4}$/.test(value) &&
    crc16(value.slice(0, -4)) === value.slice(-4)
  );
}
