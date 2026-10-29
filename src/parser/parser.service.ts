import { Injectable, Logger } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { CatalogStorageService } from './catalog-storage.service';
import { ProductParserService } from './product-parser.service';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly productParserService: ProductParserService,
    private readonly catalogStorageService: CatalogStorageService,
  ) {}

  async parse(url: string) {
    const target = new URL(url);

    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('URL должен использовать HTTP или HTTPS');
    }

    const categories = await this.catalogService.getCategories(target.href);
    const saved = { categories: 0, subcategories: 0, products: 0 };

    for (const category of categories) {
      this.logger.log(`Категория: ${category.name} (${category.url})`);
      const savedCategory =
        await this.catalogStorageService.upsertCategory(category);
      saved.categories++;

      const subcategories = await this.catalogService.getSubcategories(
        category.url,
      );

      this.logger.log(`Найдено подкатегорий: ${subcategories.length}`);
      const sections = subcategories.length > 0 ? subcategories : [category];

      if (subcategories.length === 0) {
        this.logger.log('Подкатегорий нет, собираю товары самой категории');
      }

      for (const section of sections) {
        const savedSubcategory =
          subcategories.length > 0
            ? await this.catalogStorageService.upsertSubcategory(
                section,
                savedCategory.id,
              )
            : null;

        if (savedSubcategory) saved.subcategories++;

        this.logger.log(`Раздел с товарами: ${section.name} (${section.url})`);
        const productUrls = await this.catalogService.getProductUrls(
          section.url,
        );

        for (const productUrl of productUrls) {
          this.logger.log(`Обрабатываю товар: ${productUrl}`);
          const productData =
            await this.productParserService.getProductData(productUrl);

          await this.catalogStorageService.upsertProduct(
            productData,
            savedCategory.id,
            savedSubcategory?.id ?? null,
          );
          saved.products++;
          this.logger.log(`Сохранён товар: ${productData.name}`);
        }
      }
    }

    this.logger.log(
      `Загрузка завершена. Обработано категорий: ${saved.categories}, ` +
        `подкатегорий: ${saved.subcategories}, товаров: ${saved.products}`,
    );

    return saved;
  }
}
