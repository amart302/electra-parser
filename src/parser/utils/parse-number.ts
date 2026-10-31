export function parseNumber(
  value: string | undefined | null,
  unit: 'W' | 'V' | 'm2' | 'count' = 'W',
): number | null {
  if (value == null || !value.trim()) return null;

  const units = {
    W: /(?:w|вт)$/i,
    V: /(?:v|в)$/i,
    m2: /(?:м²|м2|m²|m2|кв\.?м\.?)$/i,
    count: /(?:шт\.?)$/i,
  };

  const normalized = value
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(units[unit], '')
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
