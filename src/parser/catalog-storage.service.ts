import { Injectable } from '@nestjs/common';

import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import type { ParsedSection, ParseResult } from './types/parsed-data.types';
import { makeSlug } from './utils/make-slug';

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
      brand: product.brand,
      name: this.normalizeName(product.name),
      sourceUrl: source.href,
      categoryId,
      subcategoryId,
    } satisfies Prisma.ProductUncheckedCreateInput;

    const keys = new Set<string>();
    for (const attribute of product.attributes) {
      if (keys.has(attribute.key))
        throw new Error(`Повторная характеристика: ${attribute.key}`);
      keys.add(attribute.key);
      const valueType = typeof attribute.value;
      if (
        !['string', 'number', 'boolean'].includes(valueType) ||
        (valueType === 'number' &&
          (attribute.type !== 'NUMBER' || !Number.isFinite(attribute.value))) ||
        (valueType === 'boolean' && attribute.type !== 'BOOLEAN')
      ) {
        throw new Error(
          `Недопустимое значение характеристики: ${attribute.key}`,
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (subcategoryId !== null) {
          const subcategory = await tx.subcategory.findUnique({
            where: { id: subcategoryId },
            select: { categoryId: true },
          });
          if (!subcategory || subcategory.categoryId !== categoryId) {
            throw new Error(
              `Подкатегория ${subcategoryId} не принадлежит категории ${categoryId}`,
            );
          }
        }
        const saved = await tx.product.upsert({
          where: { sourceUrl: data.sourceUrl },
          create: data,
          update: data,
        });
        await tx.productDimensions.deleteMany({
          where: { productId: saved.id },
        });
        if (
          product.dimensions &&
          Object.values(product.dimensions).some(
            (value) => value !== null && value !== undefined && value !== '',
          )
        ) {
          await tx.productDimensions.create({
            data: { ...product.dimensions, productId: saved.id },
          });
        }
        await tx.productElectrical.deleteMany({
          where: { productId: saved.id },
        });
        if (
          product.electrical &&
          Object.values(product.electrical).some(
            (value) => value !== null && value !== undefined && value !== '',
          )
        ) {
          await tx.productElectrical.create({
            data: { ...product.electrical, productId: saved.id },
          });
        }
        await tx.productAppearance.deleteMany({
          where: { productId: saved.id },
        });
        if (
          product.appearance &&
          Object.values(product.appearance).some(
            (value) => value !== null && value !== undefined && value !== '',
          )
        ) {
          await tx.productAppearance.create({
            data: { ...product.appearance, productId: saved.id },
          });
        }
        await tx.productPackaging.deleteMany({
          where: { productId: saved.id },
        });
        if (
          product.packaging &&
          Object.values(product.packaging).some(
            (value) => value !== null && value !== undefined && value !== '',
          )
        ) {
          await tx.productPackaging.create({
            data: { ...product.packaging, productId: saved.id },
          });
        }
        const values: Prisma.ProductAttributeCreateManyInput[] = [];
        for (const { key, name, type, unit, value } of product.attributes) {
          const attribute = await tx.attribute.upsert({
            where: { key },
            create: { key, name, type, unit },
            update: {},
          });
          if (attribute.type !== type || attribute.unit !== unit) {
            throw new Error(`Изменилось определение характеристики: ${key}`);
          }
          values.push({
            productId: saved.id,
            attributeId: attribute.id,
            textValue: typeof value === 'string' ? value : null,
            numberValue: typeof value === 'number' ? value : null,
            booleanValue: typeof value === 'boolean' ? value : null,
          });
        }
        await tx.productAttribute.deleteMany({
          where: { productId: saved.id },
        });
        if (values.length)
          await tx.productAttribute.createMany({ data: values });
        return saved;
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
