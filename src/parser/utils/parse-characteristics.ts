import { createHash } from 'node:crypto';

import type {
  ParsedAttribute,
  ParsedCharacteristics,
} from '../types/parsed-data.types';
import { parseLampCount } from './parse-lamp-count';
import { parseMaxLampPower } from './parse-max-lamp-power';
import { parseMaxProductPower } from './parse-max-product-power';
import { parseNumber } from './parse-number';

type Group = 'dimensions' | 'electrical' | 'appearance' | 'packaging';
type Definition = Omit<ParsedAttribute, 'value'> & {
  group?: Group;
  field?: string;
};
const definitions: Definition[] = [
  {
    key: 'heightMm',
    name: 'Высота изделия, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'heightMm',
  },
  {
    key: 'widthMm',
    name: 'Ширина изделия, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'widthMm',
  },
  {
    key: 'lengthMm',
    name: 'Длина изделия, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'lengthMm',
  },
  {
    key: 'diameterMm',
    name: 'Диаметр изделия, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'diameterMm',
  },
  {
    key: 'baseDiameterMm',
    name: 'Диаметр основания, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'baseDiameterMm',
  },
  {
    key: 'brand',
    name: 'Бренд',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lampCount',
    name: 'Количество ламп',
    type: 'NUMBER',
    unit: null,
    group: 'electrical',
    field: 'lampCount',
  },
  {
    key: 'maxLampPowerW',
    name: 'Максимальная мощность лампы, Вт',
    type: 'NUMBER',
    unit: 'W',
    group: 'electrical',
    field: 'maxLampPowerW',
  },
  {
    key: 'maxProductPowerW',
    name: 'Максимальная мощность изделия, Вт',
    type: 'NUMBER',
    unit: 'W',
    group: 'electrical',
    field: 'maxProductPowerW',
  },
  {
    key: 'lampshadeMaterial',
    name: 'Материал плафона',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'lampshadeMaterial',
  },
  {
    key: 'voltageV',
    name: 'Напряжение, В',
    type: 'NUMBER',
    unit: 'V',
    group: 'electrical',
    field: 'voltageV',
  },
  {
    key: 'frameColor',
    name: 'Цвет каркаса',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'frameColor',
  },
  {
    key: 'lampshadeColor',
    name: 'Цвет плафона',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'lampshadeColor',
  },
  {
    key: 'lampBase',
    name: 'Цоколь лампы',
    type: 'TEXT',
    unit: null,
    group: 'electrical',
    field: 'lampBase',
  },
  {
    key: 'lightingAreaM2',
    name: 'Площадь освещения, кв.м.',
    type: 'NUMBER',
    unit: 'm2',
  },
  {
    key: 'mountingMethod',
    name: 'Способ монтажа',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'mountingMethod',
  },
  {
    key: 'frameMaterial',
    name: 'Материал каркаса',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'frameMaterial',
  },
  {
    key: 'diffuserShape',
    name: 'Форма рассеивателя',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'diffuserShape',
  },
  {
    key: 'packaging',
    name: 'Фасовка',
    type: 'TEXT',
    unit: null,
    group: 'packaging',
    field: 'packaging',
  },
  {
    key: 'packageHeightCm',
    name: 'Упаковка, высота, см',
    type: 'NUMBER',
    unit: 'cm',
    group: 'packaging',
    field: 'heightCm',
  },
  {
    key: 'packageWidthCm',
    name: 'Упаковка, ширина, см',
    type: 'NUMBER',
    unit: 'cm',
    group: 'packaging',
    field: 'widthCm',
  },
  {
    key: 'packageLengthCm',
    name: 'Упаковка, длина, см',
    type: 'NUMBER',
    unit: 'cm',
    group: 'packaging',
    field: 'lengthCm',
  },
  {
    key: 'packageWeightKg',
    name: 'Упаковка, вес, кг',
    type: 'NUMBER',
    unit: 'kg',
    group: 'packaging',
    field: 'weightKg',
  },
  {
    key: 'packageVolumeM3',
    name: 'Упаковка, объем, куб.м',
    type: 'NUMBER',
    unit: 'm3',
    group: 'packaging',
    field: 'volumeM3',
  },
  {
    key: 'quantityPerPackage',
    name: 'Количество в упаковке',
    type: 'NUMBER',
    unit: null,
    group: 'packaging',
    field: 'quantityPerPackage',
  },
  {
    key: 'lightingMode',
    name: 'Режим свечения',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'maxConnectedUnits',
    name: 'Соединяется последовательно, шт.',
    type: 'NUMBER',
    unit: null,
  },
  {
    key: 'color',
    name: 'Цвет',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'wireColor',
    name: 'Цвет провода',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'moistureProtection',
    name: 'Влагозащищенность',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'hasController',
    name: 'Наличие контроллера',
    type: 'BOOLEAN',
    unit: null,
  },
  {
    key: 'powerConsumptionW',
    name: 'Потребляемая мощность, Вт',
    type: 'NUMBER',
    unit: 'W',
    group: 'electrical',
    field: 'powerConsumptionW',
  },
  {
    key: 'isFrostResistant',
    name: 'Морозоустойчивость',
    type: 'BOOLEAN',
    unit: null,
  },
  {
    key: 'batteryType',
    name: 'Элементы питания',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'glassColor',
    name: 'Цвет стекла',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lightColor',
    name: 'Цвет свечения',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'ledColor',
    name: 'Цвет светодиодов',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'fixtureColor',
    name: 'Цвет светильника',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'baseColor',
    name: 'Цвет основания',
    type: 'TEXT',
    unit: null,
    group: 'appearance',
    field: 'baseColor',
  },
  {
    key: 'backlightColorTemperatureK',
    name: 'Цветовая температура подсветки, Кельвин',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'colorTemperatureK',
    name: 'Цветовая температура, Кельвин',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'controlType',
    name: 'Управление',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'clockType',
    name: 'Тип часов',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'installationType',
    name: 'Тип установки светильника',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'ledType',
    name: 'Тип светодиодов',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'profileType',
    name: 'Тип профиля',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lampType',
    name: 'Тип лампы',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'style',
    name: 'Стиль',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'ipRating',
    name: 'Степень защиты IP',
    type: 'TEXT',
    unit: null,
    group: 'electrical',
    field: 'ipRating',
  },
  {
    key: 'outputCurrentA',
    name: 'Сила тока на выходе, А',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'backlightLuminousFluxLm',
    name: 'Световой поток подсветки, люмен',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'luminousFluxLm',
    name: 'Световой поток, люмен',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'isSelfAdhesive',
    name: 'Самоклеющаяся основа',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'attachmentSize',
    name: 'Размер насадки',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'sizeMm',
    name: 'Размер, мм',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'heatsink',
    name: 'Радиатор',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'clockFeatures',
    name: 'Особенности часов',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'features',
    name: 'Особенности светильника',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'hasNightLight',
    name: 'Ночник',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'marketplaceSalesProhibited',
    name: 'Не продавать в Маркетплейсах',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'hasRemoteControl',
    name: 'Наличие ПДУ',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'powerW',
    name: 'Мощность, Вт',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'smdLedPowerW',
    name: 'Мощность SMD LED, Вт',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'cuttingIntervalM',
    name: 'Минимальный фрагмент резки, м',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'usageLocation',
    name: 'Место использования',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'fixtureMaterial',
    name: 'Материал светильника',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'housingMaterial',
    name: 'Материал корпуса',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'maxBacklightPower',
    name: 'Максимальная мощность светодиодной подсветки',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lampsIncluded',
    name: 'Лампы в комплекте',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'modeCount',
    name: 'Количество режимов работы',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'attachmentCount',
    name: 'Количество насадок',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lampsPerMeter',
    name: 'Количество ламп на метр',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'connectionKitsPerRoll',
    name: 'Количество комплектов подключения в бухте',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'ledCount',
    name: 'Количество led',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'electricalProtectionClass',
    name: 'Класс электрозащиты',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'lightSource',
    name: 'Источник света',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'instructions',
    name: 'Инструкция',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'colorRenderingIndexRa',
    name: 'Индекс цветопередачи, RA',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'ratedPower',
    name: 'Допустимая мощность',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'additionalOptions',
    name: 'Доп. опции светильника',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'wireLengthMm',
    name: 'Длина провода, мм',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'hasDimmer',
    name: 'Диммер',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'sphereDiameterMm',
    name: 'Диаметр шара, мм',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'attachmentDiameterMm',
    name: 'Диаметр насадки, мм',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'mountingHoleDiameterMm',
    name: 'Диаметр монтажного отверстия, мм',
    type: 'NUMBER',
    unit: 'mm',
    group: 'dimensions',
    field: 'mountingHoleDiameterMm',
  },
  {
    key: 'hasMotionSensor',
    name: 'Датчик движения',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'warrantyYears',
    name: 'Гарантия, лет',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'maxHeight',
    name: 'Высота максимальная',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'inputVoltageV',
    name: 'Входное напряжение (изм.), B',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'operatingTimeH',
    name: 'Время работы, ч.',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'powerSource',
    name: 'Вид питания',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'powerSupplyIncluded',
    name: 'Блок питания в комплекте',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'hasWirelessCharging',
    name: 'Беспроводная зарядка для мобильных устройств',
    type: 'TEXT',
    unit: null,
  },
  {
    key: 'halogenEquivalentW',
    name: 'Аналог галогеновой лампы, Вт',
    type: 'TEXT',
    unit: null,
  },
];
const byName = new Map(
  definitions.map((definition) => [definition.name, definition]),
);

export function parseCharacteristics(
  source: Record<string, string>,
  onFallback: (key: string, value: string) => void = () => {},
): ParsedCharacteristics {
  const result: ParsedCharacteristics = { brand: null, attributes: [] };
  for (const [rawName, rawValue] of Object.entries(source)) {
    const name = rawName.trim();
    const text = rawValue.trim();
    if (!name || !text) continue;
    const definition: Definition = byName.get(name) ?? {
      key: `source_${createHash('sha256').update(name).digest('hex')}`,
      name,
      type: 'TEXT',
      unit: null,
    };
    const { key, type, unit, group, field } = definition;
    let value: ParsedAttribute['value'] = text;
    try {
      if (type === 'BOOLEAN') {
        if (!/^(да|нет)$/i.test(text))
          throw new Error('Неизвестное логическое значение');
        value = text.toLowerCase() === 'да';
      } else if (type === 'NUMBER') {
        if (key === 'lampCount') value = parseLampCount(text)!;
        else if (key === 'maxLampPowerW') value = parseMaxLampPower(text)!;
        else if (key === 'maxProductPowerW')
          value = parseMaxProductPower(text)!;
        else {
          const parseUnit =
            unit === 'V'
              ? 'V'
              : unit === 'm2'
                ? 'm2'
                : ['quantityPerPackage', 'maxConnectedUnits'].includes(key)
                  ? 'count'
                  : 'W';
          value = parseNumber(text, parseUnit, {
            allowUpperBound: key === 'lightingAreaM2',
          })!;
          if (
            parseUnit === 'count' &&
            (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647)
          )
            throw new Error('Недопустимое количество');
        }
        const scale =
          group === 'dimensions' ||
          (group === 'packaging' && !['volumeM3', 'weightKg'].includes(field!))
            ? 2
            : field === 'volumeM3' || !group
              ? 6
              : 3;
        const limit =
          group === 'dimensions' ||
          (group === 'packaging' &&
            ['heightCm', 'widthCm', 'lengthCm'].includes(field!))
            ? 1e8
            : field === 'weightKg'
              ? 1e7
              : field === 'volumeM3'
                ? 1e6
                : group
                  ? 1e9
                  : 1e14;
        const factor = 10 ** scale;
        if (
          Math.abs(value) >= limit ||
          value !== Math.round(value * factor) / factor
        )
          throw new Error('Значение вне точности поля');
      }
    } catch {
      value = text;
      onFallback(key, text);
    }
    if (key === 'brand') {
      result.brand = text;
      continue;
    }
    const typed =
      type === 'TEXT' ||
      (type === 'NUMBER' && typeof value === 'number') ||
      (type === 'BOOLEAN' && typeof value === 'boolean');
    if (group && field && typed) {
      const target = result[group] ?? {};
      Object.assign(target, { [field]: value });
      Object.assign(result, { [group]: target });
      // Retain a composite source expression alongside its derived upper bound or count.
      if (type === 'NUMBER' && /[+/]/.test(text)) {
        result.attributes.push({ key, name, type, unit, value: text });
      }
    } else {
      result.attributes.push({ key, name, type, unit, value });
    }
  }
  return result;
}
