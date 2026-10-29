ALTER TABLE "products"
ALTER COLUMN "maxProductPowerW" TYPE VARCHAR(255)
USING "maxProductPowerW"::text,
ALTER COLUMN "powerConsumptionW" TYPE VARCHAR(255)
USING "powerConsumptionW"::text;
