ALTER TABLE "products"
ALTER COLUMN "maxConnectedUnits" TYPE VARCHAR(100)
USING "maxConnectedUnits"::text;
