-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(2048),
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "sourceUrl" VARCHAR(2048) NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(12,2),
    "brand" VARCHAR(255),
    "heightMm" DECIMAL(10,2),
    "widthMm" DECIMAL(10,2),
    "lengthMm" DECIMAL(10,2),
    "diameterMm" DECIMAL(10,2),
    "baseDiameterMm" DECIMAL(10,2),
    "lampCount" INTEGER,
    "maxLampPowerW" DECIMAL(10,2),
    "maxProductPowerW" DECIMAL(10,2),
    "voltageV" VARCHAR(100),
    "lampBase" VARCHAR(100),
    "lightingArea" VARCHAR(100),
    "lightingMode" VARCHAR(100),
    "maxConnectedUnits" INTEGER,
    "color" VARCHAR(255),
    "wireColor" VARCHAR(255),
    "isMoistureResistant" BOOLEAN,
    "hasController" BOOLEAN,
    "powerConsumptionW" DECIMAL(10,2),
    "isFrostResistant" BOOLEAN,
    "lampshadeMaterial" VARCHAR(255),
    "frameMaterial" VARCHAR(255),
    "frameColor" VARCHAR(255),
    "lampshadeColor" VARCHAR(255),
    "mountingMethod" VARCHAR(255),
    "diffuserShape" VARCHAR(255),
    "packaging" VARCHAR(255),
    "packageHeightCm" DECIMAL(10,2),
    "packageWidthCm" DECIMAL(10,2),
    "packageLengthCm" DECIMAL(10,2),
    "packageWeightKg" DECIMAL(10,3),
    "packageVolumeM3" DECIMAL(12,6),
    "quantityPerPackage" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "subcategoryId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_categoryId_name_key" ON "subcategories"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sourceUrl_key" ON "products"("sourceUrl");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_subcategoryId_idx" ON "products"("subcategoryId");

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
