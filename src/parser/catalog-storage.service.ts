import { Injectable } from '@nestjs/common';

import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import type { ParsedSection, ParseResult } from './types/parsed-data.types';
import { makeSlug } from './utils/make-slug';
import { legacyAttributeKey } from './utils/parse-attributes';

@Injectable()
export class CatalogStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCategory(section: Pick<ParsedSection, 'name' | 'imageUrl'>) {
    const name = this.normalizeName(section.name);
    const data = { name, imageUrl: section.imageUrl };

    return this.withUniqueSlug(name, (slug) =>
      this.prisma.category.upsert({
        where: { name },
        create: { ...data, slug },
        update: data,
      }),
    );
  }

  async upsertSubcategory(
    section: Pick<ParsedSection, 'name' | 'imageUrl'>,
    categoryId: number,
  ) {
    const name = this.normalizeName(section.name);
    const data = { name, imageUrl: section.imageUrl, categoryId };

    return this.withUniqueSlug(name, (slug) =>
      this.prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId, name } },
        create: { ...data, slug },
        update: data,
      }),
    );
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
      imageUrls: product.imageUrls,
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

    const keys = new Set<string>();
    for (const attribute of product.attributes) {
      if (keys.has(attribute.key)) {
        throw new Error(`Повторная характеристика: ${attribute.key}`);
      }
      keys.add(attribute.key);
      if (
        (typeof attribute.value === 'number' &&
          (attribute.type !== 'NUMBER' || !Number.isFinite(attribute.value))) ||
        (typeof attribute.value === 'boolean' &&
          attribute.type !== 'BOOLEAN') ||
        !['string', 'number', 'boolean'].includes(typeof attribute.value)
      ) {
        throw new Error(
          `Недопустимое значение характеристики: ${attribute.key}`,
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const savedProduct = await tx.product.upsert({
          where: { sourceUrl: data.sourceUrl },
          create: data,
          update: data,
        });
        const values: Prisma.ProductAttributeCreateManyInput[] = [];
        for (const { key, name, type, unit, value } of product.attributes) {
          const legacyKey = legacyAttributeKey(name);
          if (key !== legacyKey) {
            const legacy = await tx.attribute.findUnique({
              where: { key: legacyKey },
            });
            if (legacy) {
              const existing = await tx.attribute.findUnique({
                where: { key },
              });
              if (existing) {
                throw new Error(
                  `У характеристики «${name}» уже есть оба ключа: ${legacyKey}, ${key}`,
                );
              }
              // Retain the ID so all existing product relationships remain intact.
              await tx.attribute.update({
                where: { id: legacy.id },
                data: { key },
              });
            }
          }
          const attribute = await tx.attribute.upsert({
            where: { key },
            create: { key, name, type, unit },
            update: {},
          });
          // Text is also allowed as a lossless fallback for composite source values.
          if (attribute.type !== type || attribute.unit !== unit) {
            throw new Error(`Изменилось определение характеристики: ${key}`);
          }
          values.push({
            productId: savedProduct.id,
            attributeId: attribute.id,
            textValue: typeof value === 'string' ? value : null,
            numberValue: typeof value === 'number' ? value : null,
            booleanValue: typeof value === 'boolean' ? value : null,
          });
        }
        // Replace the source snapshot atomically, removing characteristics no longer present.
        await tx.productAttribute.deleteMany({
          where: { productId: savedProduct.id },
        });
        if (values.length > 0)
          await tx.productAttribute.createMany({ data: values });
        return savedProduct;
      },
      { timeout: 30_000 },
    );
  }

  private async withUniqueSlug<T>(
    name: string,
    save: (slug: string) => Promise<T>,
  ): Promise<T> {
    const base = makeSlug(name);
    for (let suffix = 1; ; suffix++) {
      const slug = suffix === 1 ? base : `${base}-${suffix}`;
      try {
        return await save(slug);
      } catch (error) {
        // A concurrent insert can also claim a slug; retry using the DB constraint.
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
      }
    }
  }

  private normalizeName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new Error('Название не должно быть пустым');
    }
    return name;
  }
}
