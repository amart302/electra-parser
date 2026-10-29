import { Injectable } from '@nestjs/common';

import { BrowserService } from '@/browser/browser.service';

import { ParseResult } from './parser.service';

@Injectable()
export class CatalogService {
  constructor(private readonly browserService: BrowserService) {}

  async getCategoryUrl(url: string): Promise<string> {
    const page = this.browserService.getPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const selector = 'a.ttl[href="/catalog/Lyustry/"]';

    await page.waitForSelector(selector);

    const categoryUrl = await page.$eval(selector, (element) => element.href);

    return categoryUrl;
  }

  async getSubcategoryUrl(categoryUrl: string): Promise<string> {
    const page = this.browserService.getPage();

    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded' });

    const selector = 'a.ttl[href="/catalog/Lyustry_ILLUMICO/"]';

    await page.waitForSelector(selector);

    const subCategoryUrl = await page.$eval(
      selector,
      (element) => element.href,
    );

    return subCategoryUrl;
  }

  async getProductUrls(subcategoryUrl: string): Promise<string[]> {
    const page = this.browserService.getPage();

    await page.goto(subcategoryUrl, {
      waitUntil: 'domcontentloaded',
    });

    const selector = 'a.nohyphenate[href]';

    await page.waitForSelector(selector);

    return page.$$eval(selector, (elements) =>
      elements.map((element) => element.href),
    );
  }

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

    const selector = '.prw-panel a.nx-fancybox[href]';

    await page.waitForSelector(selector);

    const imageUrls = await page.$$eval(selector, (elements) => [
      ...new Set(elements.map((element) => element.href)),
    ]);

    await page.waitForSelector(titleSelector);

    const title = await page.$eval(titleSelector, (element) => {
      const text = element.textContent ?? '';
      return text;
    });

    await page.waitForSelector(priceSelector);

    const price = await page.$eval(priceSelector, (element) => {
      const text = element.textContent ?? '';
      return Number(text.replace(/\D/g, ''));
    });

    await page.waitForSelector(paramsSelector);

    const dimensions = await page.$$eval('tr', (rows) => {
      const keys: Record<string, string> = {
        'Высота изделия, мм': 'height',
        'Ширина изделия, мм': 'width',
        'Длина изделия, мм': 'length',
        'Диаметр изделия, мм': 'diameter',
        Бренд: 'brand',
        'Количество ламп': 'lampCount',
        'Максимальная мощность лампы, Вт': 'maxLampPowerW',
        'Материал плафона': 'lampshadeMaterial',
        'Напряжение, В': 'voltageV',
        'Цвет каркаса': 'frameColor',
        'Цвет плафона': 'lampshadeColor',
        'Цоколь лампы': 'lampBase',
        'Площадь освещения, кв.м.': 'lightingAreaSqM',
        'Способ монтажа': 'mountingMethod',
        'Материал каркаса': 'frameMaterial',
        'Форма рассеивателя': 'diffuserShape',
        Фасовка: 'packaging',
        'Упаковка, высота, см': 'packageHeightCm',
        'Упаковка, ширина, см': 'packageWidthCm',
        'Упаковка, длина, см': 'packageLengthCm',
        'Упаковка, вес, кг': 'packageWeightKg',
        'Упаковка, объем, куб.м': 'packageVolumeCubM',
        'Количество в упаковке': 'quantityPerPackage',
      };

      const result: Record<string, string> = {};

      for (const row of rows) {
        const name = row.querySelector('th')?.textContent?.trim();
        const value = row.querySelector('td')?.textContent?.trim();
        const key = name ? keys[name] : undefined;

        if (key && value) {
          result[key] = value;
        }
      }

      return result;
    });

    return {
      imageUrls,
      title,
      price,
      height: Number(dimensions.height),
      width: Number(dimensions.width),
      length: Number(dimensions.length),
      diameter: Number(dimensions.diameter),
      brand: dimensions.brand,
      lampCount: Number(dimensions.lampCount),
      maxLampPowerW: Number(dimensions.maxLampPowerW),
      lampshadeMaterial: dimensions.lampshadeMaterial,
      voltageV: Number(dimensions.voltageV),
      frameColor: dimensions.frameColor,
      lampshadeColor: dimensions.lampshadeColor,
      lampBase: dimensions.lampBase,
      lightingAreaSqM: dimensions.lightingAreaSqM,
      mountingMethod: dimensions.mountingMethod,
      frameMaterial: dimensions.frameMaterial,
      diffuserShape: dimensions.diffuserShape,
      packaging: dimensions.packaging,
      packageHeightCm: Number(dimensions.packageHeightCm),
      packageWidthCm: Number(dimensions.packageWidthCm),
      packageLengthCm: Number(dimensions.packageLengthCm),
      packageWeightKg: Number(dimensions.packageWeightKg),
      packageVolumeCubM: Number(dimensions.packageVolumeCubM),
      quantityPerPackage: Number(dimensions.quantityPerPackage),
    };
  }
}
