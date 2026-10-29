import { Injectable } from '@nestjs/common';

import { CatalogService } from './catalog.service';

export interface ParseResult {
  imageUrls: string[];
  title: string;
  price: number;
  height: number;
  width: number;
  length: number;
  diameter: number;
  brand: string;
  lampCount: number;
  maxLampPowerW: number;
  lampshadeMaterial: string;
  voltageV: number;
  frameColor: string;
  lampshadeColor: string;
  lampBase: string;
  lightingAreaSqM: string;
  mountingMethod: string;
  frameMaterial: string;
  diffuserShape: string;
  packaging: string;
  packageHeightCm: number;
  packageWidthCm: number;
  packageLengthCm: number;
  packageWeightKg: number;
  packageVolumeCubM: number;
  quantityPerPackage: number;
}

@Injectable()
export class ParserService {
  constructor(private readonly catalogService: CatalogService) {}

  async parse(url: string) {
    const target = new URL(url);

    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('URL должен использовать HTTP или HTTPS');
    }

    const categoryUrl = await this.catalogService.getCategoryUrl(target.href);

    const subcategoryUrl =
      await this.catalogService.getSubcategoryUrl(categoryUrl);

    const productUrls =
      await this.catalogService.getProductUrls(subcategoryUrl);

    for (const productUrl of productUrls) {
      const productData = await this.catalogService.getProductData(productUrl);

      console.log(productData);
    }
  }
}
