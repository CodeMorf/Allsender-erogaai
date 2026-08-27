# Email Reports & SMTP Delivery — ErogaAI SaaS

## SMTP Configuration

Environment variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_FROM_NAME`

Or BYOK per organization via Organization Settings.

## SMTP Test Endpoint
- `POST /api/email/test`
- Verifies transport credentials and returns `{ success: true, message: "Conexión SMTP verificada" }`.

## Scheduled Email Reports
Report schedules run daily, weekly, or monthly, delivering attached PDF and XLSX reports directly to designated finance recipients.
