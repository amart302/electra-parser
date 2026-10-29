ALTER TABLE "products"
ALTER COLUMN "isMoistureResistant" TYPE VARCHAR(100)
USING CASE
  WHEN "isMoistureResistant" IS TRUE THEN 'Да'
  WHEN "isMoistureResistant" IS FALSE THEN 'Нет'
  ELSE NULL
END;

ALTER TABLE "products"
RENAME COLUMN "isMoistureResistant" TO "moistureProtection";
