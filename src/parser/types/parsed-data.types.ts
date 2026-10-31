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

export interface ParseResult {
  sourceUrl: string;
  imageUrls: string[];
  name: string;
  attributes: ParsedAttribute[];
}
