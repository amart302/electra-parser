import { Injectable, Logger } from '@nestjs/common';

import { BrowserService } from '@/browser/browser.service';

import type { ParseResult } from './types/parsed-data.types';
import { parseNumber } from './utils/parse-number';

@Injectable()
export class ProductParserService {
  private readonly logger = new Logger(ProductParserService.name);

  constructor(private readonly browserService: BrowserService) {}

  async getProductData(productUrl: string): Promise<ParseResult> {
    const page = this.browserService.getPage();

    const titleSelector = 'h1';
    const priceSelector = 'ins.nx-price.nx-price-nologin';
    const paramsSelector = 'tr.zag';

    const response = await page.goto(productUrl, {
      waitUntil: 'domcontentloaded',
    });

    if (!response || !response.ok()) {
      throw new Error(
        `Не удалось загрузить ${productUrl}: HTTP ${response?.status() ?? 'нет ответа'}`,
      );
    }

    await page.waitForSelector(titleSelector);

    const title = await page.$eval(titleSelector, (element) => {
      const text = element.textContent ?? '';
      return text;
    });

    await page.waitForSelector(
      `${priceSelector}, .nx-basket-byer a.show-price`,
    );

    const priceText = await page.$$eval(
      priceSelector,
      (elements) => elements[0]?.textContent?.trim() ?? null,
    );
    const price =
      priceText === null
        ? null
        : Number(
            priceText
              .replace(/[\s\u00a0\u202f]/g, '')
              .replace(/(?:руб\.?|[₽рp]\.?)$/i, '')
              .replace(',', '.'),
          );

    if (price !== null && (priceText === '' || !Number.isFinite(price))) {
      throw new Error(
        `Не удалось распознать цену «${priceText}»: ${productUrl}`,
      );
    }

    await page.waitForSelector(paramsSelector);

    const imageUrls = await page.$$eval(
      '.prw-panel a.nx-fancybox[href]',
      (elements) => [...new Set(elements.map((element) => element.href))],
    );

    if (imageUrls.length === 0) {
      this.logger.warn(
        `Ссылки на изображения не найдены, проверьте карточку: ${productUrl}`,
      );
    }

    const dimensions = await page.$$eval('tr', (rows) => {
      const result: Record<string, string> = {};

      for (const row of rows) {
        const name = row.querySelector('th')?.textContent?.trim();
        const value = row.querySelector('td')?.textContent?.trim();
        const key = name ? name : undefined;

        if (key && value) {
          result[key] = value;
        }
      }

      return result;
    });

    const parseText = (value: string | undefined): string | null =>
      value?.trim() || null;
    const parseBoolean = (value: string | undefined): boolean | null => {
      if (!value?.trim()) return null;
      const normalized = value.trim().toLowerCase();
      if (normalized === 'да') return true;
      if (normalized === 'нет') return false;
      throw new Error(
        `Неизвестное логическое значение «${value}»: ${productUrl}`,
      );
    };
    const parseInteger = (value: string | undefined): number | null => {
      const result = parseNumber(value);
      if (result !== null && !Number.isInteger(result)) {
        throw new Error(
          `Ожидалось целое число, получено «${value}»: ${productUrl}`,
        );
      }
      return result;
    };

    return {
      sourceUrl: productUrl,
      imageUrls,
      name: title.trim(),
      price,
      heightMm: parseNumber(dimensions['Высота изделия, мм']),
      widthMm: parseNumber(dimensions['Ширина изделия, мм']),
      lengthMm: parseNumber(dimensions['Длина изделия, мм']),
      diameterMm: parseNumber(dimensions['Диаметр изделия, мм']),
      baseDiameterMm: parseNumber(dimensions['Диаметр основания, мм']),
      brand: parseText(dimensions['Бренд']),
      lampCount: parseText(dimensions['Количество ламп']),
      maxLampPowerW: parseText(dimensions['Максимальная мощность лампы, Вт']),
      maxProductPowerW: parseText(
        dimensions['Максимальная мощность изделия, Вт'],
      ),
      lampshadeMaterial: parseText(dimensions['Материал плафона']),
      voltageV: parseText(dimensions['Напряжение, В']),
      frameColor: parseText(dimensions['Цвет каркаса']),
      lampshadeColor: parseText(dimensions['Цвет плафона']),
      lampBase: parseText(dimensions['Цоколь лампы']),
      lightingArea: parseText(dimensions['Площадь освещения, кв.м.']),
      mountingMethod: parseText(dimensions['Способ монтажа']),
      frameMaterial: parseText(dimensions['Материал каркаса']),
      diffuserShape: parseText(dimensions['Форма рассеивателя']),
      packaging: parseText(dimensions['Фасовка']),
      packageHeightCm: parseNumber(dimensions['Упаковка, высота, см']),
      packageWidthCm: parseNumber(dimensions['Упаковка, ширина, см']),
      packageLengthCm: parseNumber(dimensions['Упаковка, длина, см']),
      packageWeightKg: parseNumber(dimensions['Упаковка, вес, кг']),
      packageVolumeM3: parseNumber(dimensions['Упаковка, объем, куб.м']),
      quantityPerPackage: parseInteger(dimensions['Количество в упаковке']),
      lightingMode: parseText(dimensions['Режим свечения']),
      maxConnectedUnits: parseText(
        dimensions['Соединяется последовательно, шт.'],
      ),
      color: parseText(dimensions['Цвет']),
      wireColor: parseText(dimensions['Цвет провода']),
      moistureProtection: parseText(dimensions['Влагозащищенность']),
      hasController: parseBoolean(dimensions['Наличие контроллера']),
      powerConsumptionW: parseText(dimensions['Потребляемая мощность, Вт']),
      isFrostResistant: parseBoolean(dimensions['Морозоустойчивость']),
    };
  }
}
