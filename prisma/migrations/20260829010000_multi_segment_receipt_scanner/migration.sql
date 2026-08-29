-- Extend supplier fiscal identity and DGII verification metadata.
ALTER TABLE "suppliers"
    ADD COLUMN "rnc_normalized" TEXT,
    ADD COLUMN "categoria_dgii" TEXT,
    ADD COLUMN "regimen_de_pagos" TEXT,
    ADD COLUMN "actividad_economica" TEXT,
    ADD COLUMN "administracion_local" TEXT,
    ADD COLUMN "facturador_electronico" TEXT,
    ADD COLUMN "licencias_vhm" TEXT,
    ADD COLUMN "dgii_source" TEXT,
    ADD COLUMN "dgii_last_verified_at" TIMESTAMP(3),
    ADD COLUMN "dgii_metadata_json" TEXT,
    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "suppliers" ALTER COLUMN "status_dgii" SET DEFAULT 'DESCONOCIDO';

UPDATE "suppliers"
SET "rnc_normalized" = NULLIF(regexp_replace(COALESCE("rnc", ''), '[^0-9]', '', 'g'), '');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "suppliers"
        WHERE "rnc_normalized" IS NOT NULL
        GROUP BY "organization_id", "rnc_normalized"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate supplier RNC values exist inside one organization. Resolve them before applying 20260829010000.';
    END IF;
END $$;

CREATE UNIQUE INDEX "suppliers_organization_id_rnc_normalized_key"
    ON "suppliers"("organization_id", "rnc_normalized");
CREATE INDEX "suppliers_organization_id_name_idx"
    ON "suppliers"("organization_id", "name");

-- A receipt session represents one fiscal document made of one or more images.
CREATE TABLE "receipt_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CAPTURING',
    "supplier_id" TEXT,
    "extraction_json" TEXT,
    "fiscal_validation_json" TEXT,
    "reconciliation_json" TEXT,
    "supplier_resolution_json" TEXT,
    "meta_json" TEXT,
    "segments_count" INTEGER NOT NULL DEFAULT 0,
    "duplicates_removed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipt_segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "receipt_session_id" TEXT NOT NULL,
    "segment_index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "image_url" TEXT,
    "image_base64" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT NOT NULL DEFAULT 'image/jpeg',
    "ocr_text" TEXT,
    "extraction_json" TEXT,
    "confidence" DOUBLE PRECISION,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_segments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expenses" ADD COLUMN "receipt_session_id" TEXT;

ALTER TABLE "expense_items"
    ADD COLUMN "discount" DOUBLE PRECISION,
    ADD COLUMN "taxable_amount" DOUBLE PRECISION,
    ADD COLUMN "itbis_amount" DOUBLE PRECISION,
    ADD COLUMN "segment_index" INTEGER,
    ADD COLUMN "confidence" DOUBLE PRECISION,
    ADD COLUMN "raw_text" TEXT;

CREATE INDEX "receipt_sessions_organization_id_status_idx"
    ON "receipt_sessions"("organization_id", "status");
CREATE UNIQUE INDEX "receipt_segments_receipt_session_id_segment_index_key"
    ON "receipt_segments"("receipt_session_id", "segment_index");
CREATE INDEX "receipt_segments_organization_id_receipt_session_id_idx"
    ON "receipt_segments"("organization_id", "receipt_session_id");
CREATE UNIQUE INDEX "expenses_receipt_session_id_key"
    ON "expenses"("receipt_session_id");

ALTER TABLE "receipt_sessions"
    ADD CONSTRAINT "receipt_sessions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "receipt_sessions"
    ADD CONSTRAINT "receipt_sessions_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receipt_segments"
    ADD CONSTRAINT "receipt_segments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "receipt_segments"
    ADD CONSTRAINT "receipt_segments_receipt_session_id_fkey"
    FOREIGN KEY ("receipt_session_id") REFERENCES "receipt_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_receipt_session_id_fkey"
    FOREIGN KEY ("receipt_session_id") REFERENCES "receipt_sessions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
