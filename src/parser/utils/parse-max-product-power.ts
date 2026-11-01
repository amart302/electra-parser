import { parseNumber } from './parse-number';

export function parseMaxProductPower(
  value: string | undefined | null,
): number | null {
  if (value == null || !value.trim()) return null;

  // Slash-separated ratings describe alternative settings, not a sum.
  // This field stores the highest available product power.
  const powers = value.split('/').map((part) => {
    const power = parseNumber(part, 'W');
    if (power === null || power < 0) {
      throw new Error(`Недопустимая мощность изделия «${value}»`);
    }
    return power;
  });
  return Math.max(...powers);
}
