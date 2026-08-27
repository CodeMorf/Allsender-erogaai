import { describe, it, expect } from 'vitest';
import { generateExpensesPDF } from '../server/reports-pdf.ts';
import { generateExpensesXLSX } from '../server/reports-excel.ts';

describe('Report Export Engine (PDF & XLSX)', () => {
  const sampleOrg = {
    id: 'org_test',
    name: 'Organización Pruebas SRL',
    rnc: '131-89241-2',
    currency: 'DOP' as const,
    plan: 'ENTERPRISE' as const,
    created_at: new Date().toISOString()
  };

  const sampleExpenses: any[] = [
    {
      id: 'exp_01',
      organization_id: 'org_test',
      company_id: 'comp_01',
      supplier_name: 'Ferretería Central SRL',
      supplier_rnc: '101-99882-1',
      ncf: 'B0100001928',
      ncf_type: 'B01',
      expense_date: '2026-08-15',
      subtotal: 5000,
      itbis_amount: 900,
      total_amount: 5900,
      currency: 'DOP',
      payment_method: 'TARJETA_EMPRESARIAL',
      classification: 'GASTO_OPERATIVO',
      expense_category: 'Suministros de Oficina',
      status: 'APROBADO',
      created_by_user_name: 'Juan Pérez'
    }
  ];

  it('generates a valid PDF buffer', async () => {
    const pdfBuffer = await generateExpensesPDF({
      organization: sampleOrg,
      title: 'Reporte de Prueba',
      expenses: sampleExpenses
    });

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(500);
    // PDF Magic Header Check (%PDF)
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('generates a valid Excel XLSX buffer', async () => {
    const xlsxBuffer = await generateExpensesXLSX({
      organization: sampleOrg,
      period: '2026-08',
      expenses: sampleExpenses
    });

    expect(xlsxBuffer).toBeDefined();
    expect(xlsxBuffer.length).toBeGreaterThan(1000);
  });
});
