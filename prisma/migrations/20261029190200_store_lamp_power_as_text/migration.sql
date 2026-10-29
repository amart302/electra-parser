ALTER TABLE "products"
ALTER COLUMN "maxLampPowerW" TYPE VARCHAR(255)
USING "maxLampPowerW"::text;

UPDATE "products"
SET "maxLampPowerW" = "maxLampPowerText"
WHERE "maxLampPowerText" IS NOT NULL;

ALTER TABLE "products" DROP COLUMN "maxLampPowerText";
