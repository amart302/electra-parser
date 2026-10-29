ALTER TABLE "products"
ALTER COLUMN "lampCount" TYPE VARCHAR(255)
USING "lampCount"::text;
