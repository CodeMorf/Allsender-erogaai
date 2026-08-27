-- Production runtime hardening: complete SQL-backed state and relations.

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "roles" ADD COLUMN "code" TEXT NOT NULL DEFAULT 'CUSTOM';
UPDATE "roles" SET "code" = "id" WHERE "code" = 'CUSTOM';
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "roles_organization_id_code_key" ON "roles"("organization_id", "code");

ALTER TABLE "receipts" ADD COLUMN "image_base64" TEXT;
ALTER TABLE "receipts" ADD COLUMN "fiscal_validation_json" TEXT;
ALTER TABLE "receipts" ADD COLUMN "meta_json" TEXT;
ALTER TABLE "receipts" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "receipts" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "receipts" ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "ai_usage_logs" ADD COLUMN "expense_id" TEXT;

ALTER TABLE "expenses" ADD COLUMN "erp_synced_at" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN "erp_response_payload" TEXT;

ALTER TABLE "api_key_logs" ALTER COLUMN "api_key_id" DROP NOT NULL;
ALTER TABLE "api_key_logs" ALTER COLUMN "organization_id" DROP NOT NULL;
UPDATE "api_key_logs" logs
SET "api_key_id" = NULL
WHERE "api_key_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "api_keys" keys WHERE keys."id" = logs."api_key_id");
UPDATE "api_key_logs" logs
SET "organization_id" = NULL
WHERE "organization_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "organizations" orgs WHERE orgs."id" = logs."organization_id");
ALTER TABLE "api_key_logs"
  ADD CONSTRAINT "api_key_logs_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
