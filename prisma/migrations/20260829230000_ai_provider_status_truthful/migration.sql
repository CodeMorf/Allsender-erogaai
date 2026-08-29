ALTER TABLE "ai_provider_configs"
ALTER COLUMN "status" SET DEFAULT 'UNTESTED';

UPDATE "ai_provider_configs"
SET "status" = 'UNTESTED',
    "last_test_message" = NULL
WHERE "status" = 'ONLINE'
  AND "has_key" = false;
