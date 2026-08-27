# External AllSender ERP Sync Integration — ErogaAI SaaS

## External Sync Pipeline

1. **Rule**: ONLY expenses in status `APROBADO` can be synced to external ERPs.
2. **Idempotency**: Requests include an `Idempotency-Key` header (`idemp_erp_${id}_${updated_at}`).
3. **Payload Structure**:
   ```json
   {
     "organization_id": "org_uuid",
     "invoice_number": "B0100000001",
     "tax_id": "131892412",
     "vendor_name": "Comercial Caribe SRL",
     "issue_date": "2026-08-15",
     "subtotal": 5000.00,
     "tax_amount": 900.00,
     "total_amount": 5900.00,
     "currency": "DOP",
     "account_code": "6105-01-000",
     "line_items": []
   }
   ```
4. **State Transition**: Status transitions to `SINCRONIZADO_ERP` only AFTER a successful HTTP 200/201 response from the ERP endpoint. If HTTP fails, status is marked `ERROR_SYNC` and error details are logged in `erp_sync_error`.
