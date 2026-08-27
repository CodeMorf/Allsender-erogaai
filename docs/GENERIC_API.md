# Generic API v1 Reference — ErogaAI SaaS

## Base URL
Base URL is derived from `APP_URL` environment variable:
`http://localhost:3000/api/v1` or `https://app.erogaai.com/api/v1`

## Authentication & Scopes
Inbound API requests require a Bearer API Key header:
`Authorization: Bearer eroga_live_sec_...`

### Available Scopes
- `ocr:process`: Upload and extract receipt images with AI.
- `expenses:read`: Query expense records.
- `expenses:write`: Create or edit expense records.
- `expenses:approve`: Approve or reject expenses.
- `dgii:export`: Download DGII 606 format.
- `companies:read`: View companies and branches.

## Endpoints

- `GET /api/v1/health` — System status check.
- `POST /api/v1/ocr/scan` — Upload base64 image and extract fiscal fields.
- `GET /api/v1/expenses` — Query expenses with company/status filters.
- `GET /api/v1/expenses/:id` — Retrieve single expense details.
- `POST /api/v1/expenses/:id/approve` — Approve expense for accounting/ERP.
- `POST /api/v1/expenses/:id/reject` — Reject expense with notes.
- `GET /api/v1/reports/dgii-606` — Generate period DGII 606 report JSON.
