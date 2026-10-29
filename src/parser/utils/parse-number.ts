export function parseNumber(value: string | undefined | null): number | null {
  if (value == null || !value.trim()) return null;

  const normalized = value
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/(?:w|вт)$/i, '')
    .replace(',', '.');

  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    throw new Error(`Не удалось распознать число «${value}»`);
  }

  const result = Number(normalized);
  if (!Number.isFinite(result)) {
    throw new Error(`Число вне допустимого диапазона: «${value}»`);
  }
  return result;
}
