import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envValidationSchema } from '@/common/config/env.validation';
import { PrismaModule } from '@/prisma/prisma.module';

import { BrowserService } from './browser/browser.service';
import { CatalogService } from './parser/catalog.service';
import { CatalogStorageService } from './parser/catalog-storage.service';
import { ParserService } from './parser/parser.service';
import { ProductParserService } from './parser/product-parser.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    PrismaModule,
  ],
  providers: [
    BrowserService,
    CatalogService,
    ParserService,
    ProductParserService,
    CatalogStorageService,
  ],
})
export class AppModule {}
