import ExcelJS from 'exceljs';
import { ExpenseRecord, Organization, Company } from '../src/types.ts';

export interface ExcelExportOptions {
  organization: Organization;
  company?: Company;
  period?: string;
  expenses: ExpenseRecord[];
  generatedBy?: string;
}

/**
 * Generates a Multi-Sheet Excel (.xlsx) Report with Summary and Detailed Rows
 */
export async function generateExpensesXLSX(options: ExcelExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ErogaAI SaaS Platform';
  workbook.lastModifiedBy = options.generatedBy || 'ErogaAI System';
  workbook.created = new Date();

  const { organization, company, period, expenses } = options;

  // ----------------------------------------------------
  // HOJA 1: RESUMEN (Summary Sheet)
  // ----------------------------------------------------
  const summarySheet = workbook.addWorksheet('Resumen Ejecutivo', {
    views: [{ showGridLines: true }]
  });

  // Header Title
  summarySheet.mergeCells('A1:E1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `ErogaAI — Resumen de Erogaciones (${organization.name})`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  summarySheet.mergeCells('A2:E2');
  const subTitleCell = summarySheet.getCell('A2');
  subTitleCell.value = `Empresa: ${company ? company.name : 'Todas las Empresas'} | Período: ${period || 'Todos'} | Generado: ${new Date().toLocaleDateString('es-DO')}`;
  subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  summarySheet.addRow([]);

  // Summary Metrics Table Header
  const metricHeaderRow = summarySheet.addRow(['Indicador / Métrica', 'Cantidad', 'Subtotal (RD$)', 'ITBIS 18% (RD$)', 'Monto Total (RD$)']);
  metricHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  metricHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const totalSpent = expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.total_amount : 0), 0);
  const totalITBIS = expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.itbis_amount : 0), 0);
  const totalSubtotal = expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.subtotal : 0), 0);
  const approvedCount = expenses.filter(e => e.status === 'APROBADO' || e.status === 'SINCRONIZADO_ERP').length;
  const pendingCount = expenses.filter(e => e.status === 'PENDIENTE_REVISION').length;
  const rejectedCount = expenses.filter(e => e.status === 'RECHAZADO').length;

  summarySheet.addRow(['Comprobantes Aprobados', approvedCount, totalSubtotal, totalITBIS, totalSpent]);
  summarySheet.addRow(['Comprobantes Pendientes', pendingCount, 0, 0, 0]);
  summarySheet.addRow(['Comprobantes Rechazados', rejectedCount, 0, 0, 0]);

  // ----------------------------------------------------
  // HOJA 2: DETALLE (Detailed Records Sheet)
  // ----------------------------------------------------
  const detailSheet = workbook.addWorksheet('Detalle Comprobantes 606', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  const columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Fecha', key: 'expense_date', width: 12 },
    { header: 'Empresa Emisora', key: 'company_name', width: 25 },
    { header: 'Sucursal / Sede', key: 'branch_name', width: 18 },
    { header: 'Proveedor', key: 'supplier_name', width: 28 },
    { header: 'RNC / Cédula', key: 'supplier_rnc', width: 16 },
    { header: 'NCF / Comprobante', key: 'ncf', width: 16 },
    { header: 'Tipo NCF', key: 'ncf_type', width: 10 },
    { header: 'Subtotal (RD$)', key: 'subtotal', width: 15 },
    { header: 'ITBIS (RD$)', key: 'itbis_amount', width: 14 },
    { header: 'Propina Legal (RD$)', key: 'legal_tip_amount', width: 16 },
    { header: 'Otros Impuestos', key: 'other_taxes', width: 15 },
    { header: 'Monto Total (RD$)', key: 'total_amount', width: 16 },
    { header: 'Moneda', key: 'currency', width: 10 },
    { header: 'Forma de Pago', key: 'payment_method', width: 18 },
    { header: 'Clasificación', key: 'classification', width: 18 },
    { header: 'Categoría', key: 'expense_category', width: 24 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Usuario Registro', key: 'created_by_user_name', width: 20 },
    { header: 'Proveedor IA', key: 'ai_provider_used', width: 14 },
    { header: 'Confianza IA', key: 'ai_confidence_score', width: 14 }
  ];

  detailSheet.columns = columns;

  // Style Header Row
  const headerRow = detailSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Add Data Rows
  expenses.forEach(exp => {
    const row = detailSheet.addRow({
      id: exp.id,
      expense_date: exp.expense_date || exp.date,
      company_name: exp.company_name || 'Principal',
      branch_name: exp.branch_name || 'Central',
      supplier_name: exp.supplier_name,
      supplier_rnc: exp.supplier_rnc,
      ncf: exp.ncf,
      ncf_type: exp.ncf_type,
      subtotal: exp.subtotal,
      itbis_amount: exp.itbis_amount,
      legal_tip_amount: exp.legal_tip_amount,
      other_taxes: exp.other_taxes,
      total_amount: exp.total_amount,
      currency: exp.currency,
      payment_method: exp.payment_method,
      classification: exp.classification,
      expense_category: exp.expense_category,
      status: exp.status,
      created_by_user_name: exp.created_by_user_name || exp.created_by_name,
      ai_provider_used: exp.ai_provider_used,
      ai_confidence_score: `${exp.ai_confidence_score || 95}%`
    });

    // Formatting numbers
    row.getCell('subtotal').numFmt = '"RD$"#,##0.00';
    row.getCell('itbis_amount').numFmt = '"RD$"#,##0.00';
    row.getCell('legal_tip_amount').numFmt = '"RD$"#,##0.00';
    row.getCell('other_taxes').numFmt = '"RD$"#,##0.00';
    row.getCell('total_amount').numFmt = '"RD$"#,##0.00';
  });

  // Enable Auto Filter
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: expenses.length + 1, column: columns.length }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
