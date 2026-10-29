import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';

import type { ParsedSection, ParseResult } from './types/parsed-data.types';

@Injectable()
export class CatalogStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCategory(section: Pick<ParsedSection, 'name' | 'imageUrl'>) {
    const name = this.normalizeName(section.name);
    const data = { name, imageUrl: section.imageUrl };

    return this.prisma.category.upsert({
      where: { name },
      create: data,
      update: data,
    });
  }

  async upsertSubcategory(
    section: Pick<ParsedSection, 'name' | 'imageUrl'>,
    categoryId: number,
  ) {
    const name = this.normalizeName(section.name);
    const data = { name, imageUrl: section.imageUrl, categoryId };

    return this.prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId, name } },
      create: data,
      update: data,
    });
  }

  async upsertProduct(
    product: ParseResult,
    categoryId: number,
    subcategoryId: number | null = null,
  ) {
    const source = new URL(product.sourceUrl);
    if (!['http:', 'https:'].includes(source.protocol)) {
      throw new Error('URL товара должен использовать HTTP или HTTPS');
    }
    source.hash = '';

    const data = {
      ...product,
      name: this.normalizeName(product.name),
      sourceUrl: source.href,
      categoryId,
      subcategoryId,
    };

    if (subcategoryId !== null) {
      const subcategory = await this.prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { categoryId: true },
      });

      if (!subcategory || subcategory.categoryId !== categoryId) {
        throw new Error(
          `Подкатегория ${subcategoryId} не принадлежит категории ${categoryId}`,
        );
      }
    }

    return this.prisma.product.upsert({
      where: { sourceUrl: data.sourceUrl },
      create: data,
      update: data,
    });
  }

  private normalizeName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new Error('Название не должно быть пустым');
    }
    return name;
  }
}
