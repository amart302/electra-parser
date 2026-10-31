export interface ParsedSection {
  name: string;
  url: string;
  imageUrl: string | null;
}

export interface ParseResult {
  sourceUrl: string;
  imageUrls: string[];
  name: string;
  heightMm: number | null;
  widthMm: number | null;
  lengthMm: number | null;
  diameterMm: number | null;
  baseDiameterMm: number | null;
  brand: string | null;
  lampCount: number | null;
  maxLampPowerW: number | null;
  maxProductPowerW: number | null;
  lampshadeMaterial: string | null;
  voltageV: number | null;
  frameColor: string | null;
  lampshadeColor: string | null;
  lampBase: string | null;
  lightingAreaM2: number | null;
  mountingMethod: string | null;
  frameMaterial: string | null;
  diffuserShape: string | null;
  packaging: string | null;
  packageHeightCm: number | null;
  packageWidthCm: number | null;
  packageLengthCm: number | null;
  packageWeightKg: number | null;
  packageVolumeM3: number | null;
  quantityPerPackage: number | null;
  lightingMode: string | null;
  maxConnectedUnits: number | null;
  color: string | null;
  wireColor: string | null;
  moistureProtection: string | null;
  hasController: boolean | null;
  powerConsumptionW: number | null;
  isFrostResistant: boolean | null;
}
