import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import puppeteer, { type Browser, type Page } from 'puppeteer';

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
      headless: false,
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
      throw new Error('Puppeteer page is not initialized or has been closed');
    }

    return this.page;
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
