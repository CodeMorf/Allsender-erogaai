# Real PDF & XLSX Export Engine — ErogaAI SaaS

## PDF Generation (PDFKit)
- **Endpoint**: `GET /api/reports/pdf/expenses`
- **Output**: Multi-page Letter PDF with AllSender ErogaAI branding header, organization metadata, summary KPI box (Total Spent, Total ITBIS 18%, Total Vouchers), and structured table of expenses.

## XLSX Generation (ExcelJS)
- **Endpoint**: `GET /api/reports/excel/expenses`
- **Output**: Multi-Sheet Excel Workbook:
  1. `Resumen Ejecutivo`: Executive summary metrics, approved/pending counts, tax totals, formulas, styled dark headers.
  2. `Detalle Comprobantes 606`: Complete row-by-row accounting ledger with 21 formatted columns, auto-filters, frozen header row, monetary formatting (`RD$ #,##0.00`).
