import { parseNumber } from './parse-number';

export function parseMaxLampPower(
  value: string | undefined | null,
): number | null {
  if (value == null || !value.trim()) return null;

  // Separate lamp groups can have different ratings; the largest is the per-lamp maximum.
  const powers = value.split('+').map((part) => {
    const power = parseNumber(part, 'W');
    if (power === null || power < 0) {
      throw new Error(`Недопустимая мощность лампы «${value}»`);
    }
    return power;
  });
  return Math.max(...powers);
}
