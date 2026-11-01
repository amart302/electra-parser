import { parseNumber } from './parse-number';

export function parseLampCount(
  value: string | undefined | null,
): number | null {
  if (value == null || !value.trim()) return null;

  const normalized = value
    .trim()
    .replace(/\s*шт\.?$/i, '')
    .trim();
  const count = /^\d+(?:\s*\+\s*\d+)+$/.test(normalized)
    ? normalized.split('+').reduce((sum, part) => sum + Number(part.trim()), 0)
    : parseNumber(value, 'count');

  if (
    count !== null &&
    (!Number.isSafeInteger(count) || count < 0 || count > 2_147_483_647)
  ) {
    throw new Error(`Недопустимое количество ламп «${value}»`);
  }
  return count;
}
