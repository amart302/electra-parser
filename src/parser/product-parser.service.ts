import { Injectable, Logger } from '@nestjs/common';

import { BrowserService } from '@/browser/browser.service';

import type { ParseResult } from './types/parsed-data.types';
import { parseCharacteristics } from './utils/parse-characteristics';

@Injectable()
export class ProductParserService {
  private readonly logger = new Logger(ProductParserService.name);

  private readonly reportedCharacteristics = new Set<string>();

  constructor(private readonly browserService: BrowserService) {}

  async getProductData(productUrl: string): Promise<ParseResult> {
    const page = this.browserService.getPage();

    const titleSelector = 'h1';
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

    const characteristics = parseCharacteristics(dimensions, (key, value) => {
      if (this.reportedCharacteristics.has(key)) return;
      this.reportedCharacteristics.add(key);
      this.logger.warn(
        `Характеристика «${key}: ${value}» сохранена как текст: ${productUrl}`,
      );
    });
    return {
      sourceUrl: productUrl,
      imageUrls,
      name: title.trim(),
      ...characteristics,
    };
  }
}
