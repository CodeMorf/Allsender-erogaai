# DGII 606 & Fiscal Reporting Guide — ErogaAI SaaS

## DGII 606 Period Filtering

The DGII 606 report generator filters strictly by the requested month (`period=YYYY-MM`) and company ID (`company_id`):

`GET /api/reports/dgii-606?period=2026-08&company_id=comp_01`

### Official TXT Export Specification
Line Header:
`606|RNC_EMPRESA|PERIODO_YYYYMM|CANTIDAD_REGISTROS`

Field Columns (17 standard columns):
1. RNC/Cédula
2. Tipo ID (1=RNC, 2=Cédula)
3. Tipo Bienes y Servicios (01 a 11)
4. NCF (ej. B0100000001)
5. NCF Modificado
6. Fecha Comprobante (YYYYMMDD)
7. Fecha Pago (YYYYMMDD)
8. Monto Facturado en Servicios
9. Monto Facturado en Bienes
10. Total Monto Facturado
11. ITBIS Facturado
12. ITBIS Retenido
13. ITBIS Proporcionalidad
14. ITBIS Costo
15. ITBIS por Adelantar
16. ISR Retenido
17. Forma de Pago
