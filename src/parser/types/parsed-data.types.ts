export interface ParsedSection {
  name: string;
  url: string;
  imageUrl: string | null;
}

export interface ParsedAttribute {
  key: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN';
  unit: string | null;
  value: string | number | boolean;
}

export interface ParsedProductDimensions {
  heightMm?: number;
  widthMm?: number;
  lengthMm?: number;
  diameterMm?: number;
  baseDiameterMm?: number;
  mountingHoleDiameterMm?: number;
}

export interface ParsedProductElectrical {
  voltageV?: number;
  maxLampPowerW?: number;
  maxProductPowerW?: number;
  powerConsumptionW?: number;
  lampCount?: number;
  lampBase?: string;
  ipRating?: string;
}

export interface ParsedProductAppearance {
  frameColor?: string;
  lampshadeColor?: string;
  baseColor?: string;
  frameMaterial?: string;
  lampshadeMaterial?: string;
  diffuserShape?: string;
  mountingMethod?: string;
}

export interface ParsedProductPackaging {
  packaging?: string;
  quantityPerPackage?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  weightKg?: number;
  volumeM3?: number;
}

export interface ParsedCharacteristics {
  brand: string | null;
  dimensions?: ParsedProductDimensions;
  electrical?: ParsedProductElectrical;
  appearance?: ParsedProductAppearance;
  packaging?: ParsedProductPackaging;
  attributes: ParsedAttribute[];
}

export interface ParseResult extends ParsedCharacteristics {
  sourceUrl: string;
  imageUrls: string[];
  name: string;
}
