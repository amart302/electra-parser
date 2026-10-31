import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import puppeteer, {
  type Browser,
  type HTTPResponse,
  type Page,
} from 'puppeteer';

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;

  async onModuleInit(): Promise<void> {
    this.logger.log('Launching Puppeteer...');
    await this.launchBrowser();
    this.logger.log('Puppeteer launched successfully');
  }

  private async launchBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
    });

    try {
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      this.page.setDefaultTimeout(30_000);
      this.page.setDefaultNavigationTimeout(60_000);
    } catch (error: unknown) {
      await this.onModuleDestroy();
      throw error;
    }
  }

  getPage(): Page {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Страница Puppeteer не инициализирована или уже закрыта');
    }

    return this.page;
  }

  async navigate(
    url: string,
  ): Promise<{ page: Page; response: HTTPResponse | null }> {
    for (let attempt = 1; ; attempt++) {
      try {
        const page = this.getPage();
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
        });
        return { page, response };
      } catch (error) {
        const transient =
          error instanceof Error &&
          /Navigating frame was detached|Attempted to use detached Frame|Target closed|Session closed|Страница Puppeteer не инициализирована или уже закрыта/i.test(
            error.message,
          );
        if (!transient || attempt >= 3) {
          throw new Error(
            `Не удалось открыть ${url} (попытка ${attempt}): ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
        this.logger.warn(`Повтор открытия страницы (${attempt + 1}/3): ${url}`);
        await this.restorePage();
      }
    }
  }

  private async restorePage(): Promise<void> {
    if (!this.browser?.connected) {
      await this.launchBrowser();
      return;
    }
    const previousPage = this.page;
    this.page = null;
    if (previousPage && !previousPage.isClosed()) {
      await previousPage.close().catch(() => {});
    }
    const page = await this.browser.newPage();
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(60_000);
      this.page = page;
    } catch (error) {
      await page.close().catch(() => {});
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing Puppeteer...');
      try {
        await this.browser.close();
      } finally {
        this.page = null;
        this.browser = null;
      }
    }
  }
}
