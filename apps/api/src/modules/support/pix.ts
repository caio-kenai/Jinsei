export function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, 'utf8')) {
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
