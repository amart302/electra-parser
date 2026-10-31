import { Injectable, Logger } from '@nestjs/common';
import { TimeoutError } from 'puppeteer';

import { BrowserService } from '@/browser/browser.service';

import type { ParsedSection } from './types/parsed-data.types';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly browserService: BrowserService) {}

  async getCategories(url: string): Promise<ParsedSection[]> {
    const { page, response } = await this.browserService.navigate(url);

    if (!response || !response.ok()) {
      throw new Error(
        `Не удалось загрузить ${url}: HTTP ${response?.status() ?? 'нет ответа'}`,
      );
    }

    const selector = 'main .sneha-catalog-section a.ttl[href^="/catalog/"]';

    await page.waitForSelector(selector);

    return this.getSections();
  }

  async getSubcategories(categoryUrl: string): Promise<ParsedSection[]> {
    const { page, response } = await this.browserService.navigate(categoryUrl);

    if (!response || !response.ok()) {
      throw new Error(
        `Не удалось загрузить ${categoryUrl}: HTTP ${response?.status() ?? 'нет ответа'}`,
      );
    }

    await page.waitForSelector('main .sneha-catalog-inner');

    return this.getSections();
  }

  private async getSections(): Promise<ParsedSection[]> {
    const page = this.browserService.getPage();
    const sections = await page.$$eval(
      'main .sneha-catalog-section a.ttl[href^="/catalog/"]',
      (elements) =>
        elements.map((element) => {
          const image = element
            .closest('.element')
            ?.querySelector<HTMLImageElement>('figure.prw-block img');
          const imageSrc =
            image?.getAttribute('data-src') || image?.getAttribute('src');

          return {
            name: (element.textContent ?? '').trim(),
            url: element.href,
            imageUrl: imageSrc
              ? new URL(imageSrc, document.baseURI).href
              : null,
          };
        }),
    );
    const currentUrl = new URL(page.url());
    const uniqueSections = new Map<string, ParsedSection>();

    for (const section of sections) {
      const target = new URL(section.url);
      if (
        target.origin !== currentUrl.origin ||
        target.pathname === currentUrl.pathname ||
        target.pathname === '/catalog/'
      )
        continue;

      if (!section.name) {
        throw new Error(`У раздела отсутствует название: ${section.url}`);
      }
      uniqueSections.set(section.url, section);
    }

    return [...uniqueSections.values()];
  }

  async getProductUrls(subcategoryUrl: string): Promise<string[]> {
    const productUrls = new Set<string>();
    const visitedPages = new Set<string>();
    let nextPageUrl: string | null = new URL(subcategoryUrl).href;

    while (nextPageUrl) {
      if (visitedPages.has(nextPageUrl)) {
        throw new Error(`Обнаружен цикл пагинации: ${nextPageUrl}`);
      }

      visitedPages.add(nextPageUrl);

      const { page, response } =
        await this.browserService.navigate(nextPageUrl);

      if (!response || !response.ok()) {
        throw new Error(
          `Не удалось загрузить ${nextPageUrl}: HTTP ${response?.status() ?? 'нет ответа'}`,
        );
      }

      const containerSelector =
        'main .sneha-catalog:not(.sneha-catalog-section) .sneha-catalog-inner';
      const selector = `${containerSelector} a.nohyphenate[href]`;

      try {
        await page.waitForSelector(containerSelector);
      } catch (error: unknown) {
        if (!(error instanceof TimeoutError)) {
          throw error;
        }

        const title = await page.title();
        const sectionLinks = await page.$$eval(
          'a.ttl[href^="/catalog/"]',
          (elements) => [...new Set(elements.map((element) => element.href))],
        );

        throw new Error(
          `Не найден блок каталога ${containerSelector}. ` +
            `Подкатегория: ${subcategoryUrl}. ` +
            `Запрошенная страница: ${nextPageUrl}. ` +
            `Открытая страница: ${page.url()}. Заголовок: ${title}. ` +
            `Ссылки на разделы: ${JSON.stringify(sectionLinks)}`,
          { cause: error },
        );
      }

      const urls = await page.$$eval(selector, (elements) =>
        elements.map((element) => element.href),
      );

      if (urls.length === 0) {
        const isEmpty = await page.$eval(
          containerSelector,
          (container) =>
            container.children.length === 0 &&
            (container.textContent ?? '').trim() === '',
        );
        const hasNextPage = await page.$('a.modern-page-next[href]');

        if (!isEmpty || hasNextPage) {
          throw new Error(
            `В каталоге нет ссылок на товары, но страница не пуста или содержит следующую страницу: ${page.url()}`,
          );
        }

        this.logger.log(
          `Пустая страница каталога, обход завершён: ${page.url()}`,
        );
        break;
      }

      for (const url of urls) {
        productUrls.add(url);
      }

      nextPageUrl = await page.$eval('body', (body) => {
        const next = body.querySelector<HTMLAnchorElement>(
          'a.modern-page-next[href]',
        );

        return next?.href ?? null;
      });
    }

    return [...productUrls];
  }
}
