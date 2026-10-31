const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ compilerOptions: { types: ['node'] } });
const { parseAttributes } = require('../src/parser/utils/parse-attributes.ts');
const expected = {
  "batteryType": "Элементы питания",
  "glassColor": "Цвет стекла",
  "lightColor": "Цвет свечения",
  "ledColor": "Цвет светодиодов",
  "fixtureColor": "Цвет светильника",
  "baseColor": "Цвет основания",
  "backlightColorTemperatureK": "Цветовая температура подсветки, Кельвин",
  "colorTemperatureK": "Цветовая температура, Кельвин",
  "controlType": "Управление",
  "clockType": "Тип часов",
  "installationType": "Тип установки светильника",
  "ledType": "Тип светодиодов",
  "profileType": "Тип профиля",
  "lampType": "Тип лампы",
  "style": "Стиль",
  "ipRating": "Степень защиты IP",
  "outputCurrentA": "Сила тока на выходе, А",
  "backlightLuminousFluxLm": "Световой поток подсветки, люмен",
  "luminousFluxLm": "Световой поток, люмен",
  "isSelfAdhesive": "Самоклеющаяся основа",
  "attachmentSize": "Размер насадки",
  "sizeMm": "Размер, мм",
  "heatsink": "Радиатор",
  "clockFeatures": "Особенности часов",
  "features": "Особенности светильника",
  "hasNightLight": "Ночник",
  "marketplaceSalesProhibited": "Не продавать в Маркетплейсах",
  "hasRemoteControl": "Наличие ПДУ",
  "powerW": "Мощность, Вт",
  "smdLedPowerW": "Мощность SMD LED, Вт",
  "cuttingIntervalM": "Минимальный фрагмент резки, м",
  "usageLocation": "Место использования",
  "fixtureMaterial": "Материал светильника",
  "housingMaterial": "Материал корпуса",
  "maxBacklightPower": "Максимальная мощность светодиодной подсветки",
  "lampsIncluded": "Лампы в комплекте",
  "modeCount": "Количество режимов работы",
  "attachmentCount": "Количество насадок",
  "lampsPerMeter": "Количество ламп на метр",
  "connectionKitsPerRoll": "Количество комплектов подключения в бухте",
  "ledCount": "Количество led",
  "electricalProtectionClass": "Класс электрозащиты",
  "lightSource": "Источник света",
  "instructions": "Инструкция",
  "colorRenderingIndexRa": "Индекс цветопередачи, RA",
  "ratedPower": "Допустимая мощность",
  "additionalOptions": "Доп. опции светильника",
  "wireLengthMm": "Длина провода, мм",
  "hasDimmer": "Диммер",
  "sphereDiameterMm": "Диаметр шара, мм",
  "attachmentDiameterMm": "Диаметр насадки, мм",
  "mountingHoleDiameterMm": "Диаметр монтажного отверстия, мм",
  "hasMotionSensor": "Датчик движения",
  "warrantyYears": "Гарантия, лет",
  "maxHeight": "Высота максимальная",
  "inputVoltageV": "Входное напряжение (изм.), B",
  "operatingTimeH": "Время работы, ч.",
  "powerSource": "Вид питания",
  "powerSupplyIncluded": "Блок питания в комплекте",
  "hasWirelessCharging": "Беспроводная зарядка для мобильных устройств",
  "halogenEquivalentW": "Аналог галогеновой лампы, Вт"
};

test('assigns readable distinct keys to every newly identified source characteristic', () => {
  const values = parseAttributes(Object.fromEntries(Object.values(expected).map(name => [name, '1/50'])));
  assert.equal(values.length, Object.keys(expected).length);
  assert.equal(new Set(values.map(a => a.key)).size, values.length);
  for (const [key, name] of Object.entries(expected)) {
    const attribute = values.find(a => a.name === name);
    assert.equal(attribute.key, key);
    assert.equal(attribute.type, 'TEXT');
    assert.equal(attribute.value, '1/50');
  }
});

test('keeps established keys and supports genuinely new source names', () => {
  const input = { 'Высота изделия, мм': '530', 'Напряжение, В': '220V', 'Новая неизвестная характеристика': 'значение' };
  const first = parseAttributes(input);
  assert.equal(first[0].key, 'heightMm');
  assert.equal(first[1].key, 'voltageV');
  assert.match(first[2].key, /^source_[0-9a-f]{64}$/);
  assert.equal(parseAttributes(input)[2].key, first[2].key);
});
