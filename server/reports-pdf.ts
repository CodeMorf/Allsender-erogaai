import PDFDocument from 'pdfkit';
import { ExpenseRecord, Organization, Company, Branch } from '../src/types.ts';

export interface PDFExportOptions {
  organization: Organization;
  company?: Company;
  branch?: Branch;
  title: string;
  subtitle?: string;
  expenses: ExpenseRecord[];
  generatedBy?: string;
}

/**
 * Generates a professional Dominican Republic Tax/Expense PDF Report
 */
export function generateExpensesPDF(options: PDFExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const { organization, company, branch, title, subtitle, expenses, generatedBy } = options;

      // Header Banner
      doc.rect(40, 40, 532, 60).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('ErogaAI — Reporte Fiscal & Gastos', 55, 52);
      doc.fontSize(9).font('Helvetica').text(`Organización: ${organization.name} | RNC: ${organization.rnc}`, 55, 75);

      let y = 115;

      // Report Info Meta
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text(title, 40, y);
      y += 18;

      if (subtitle) {
        doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(subtitle, 40, y);
        y += 15;
      }

      const companyText = company ? `Empresa: ${company.name} (${company.rnc})` : 'Todas las Empresas';
      const branchText = branch ? ` | Sedes: ${branch.name}` : '';
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(`${companyText}${branchText} | Generado el: ${new Date().toLocaleDateString('es-DO')} por ${generatedBy || 'Sistema'}`, 40, y);
      y += 25;

      // Summary KPI Box
      const totalAmount = expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.total_amount : 0), 0);
      const totalITBIS = expenses.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.itbis_amount : 0), 0);
      const totalCount = expenses.length;

      doc.rect(40, y, 532, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
      doc.text('Comprobantes:', 55, y + 15);
      doc.fillColor('#2563EB').text(`${totalCount}`, 130, y + 15);

      doc.fillColor('#0F172A').text('Monto Total:', 220, y + 15);
      doc.fillColor('#10B981').text(`RD$ ${totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 295, y + 15);

      doc.fillColor('#0F172A').text('ITBIS Total (18%):', 410, y + 15);
      doc.fillColor('#6366F1').text(`RD$ ${totalITBIS.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 495, y + 15);

      y += 60;

      // Table Header
      doc.rect(40, y, 532, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('Fecha', 45, y + 6);
      doc.text('NCF / Comprobante', 105, y + 6);
      doc.text('Proveedor & RNC', 200, y + 6);
      doc.text('Clasificación', 340, y + 6);
      doc.text('ITBIS', 440, y + 6);
      doc.text('Total (RD$)', 495, y + 6);

      y += 20;

      // Table Rows
      doc.font('Helvetica').fontSize(8);
      expenses.forEach((exp, idx) => {
        if (y > 700) {
          doc.addPage();
          y = 40;
          // Redraw header
          doc.rect(40, y, 532, 20).fill('#1E293B');
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
          doc.text('Fecha', 45, y + 6);
          doc.text('NCF / Comprobante', 105, y + 6);
          doc.text('Proveedor & RNC', 200, y + 6);
          doc.text('Clasificación', 340, y + 6);
          doc.text('ITBIS', 440, y + 6);
          doc.text('Total (RD$)', 495, y + 6);
          y += 20;
          doc.font('Helvetica').fontSize(8);
        }

        const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
        doc.rect(40, y, 532, 18).fill(bgColor);

        doc.fillColor('#0F172A');
        doc.text(exp.expense_date || exp.date || '-', 45, y + 4);
        doc.text(exp.ncf || 'S/N', 105, y + 4);
        doc.text((exp.supplier_name || 'Desconocido').substring(0, 24), 200, y + 4);
        doc.text((exp.classification || 'GASTO').substring(0, 16), 340, y + 4);
        doc.text(`RD$ ${exp.itbis_amount.toFixed(2)}`, 440, y + 4);
        doc.text(`RD$ ${exp.total_amount.toFixed(2)}`, 495, y + 4);

        y += 18;
      });

      // Footer
      doc.fontSize(8).fillColor('#94A3B8').text('ErogaAI SaaS Platform — Impulsado por CodeMorf Tech (https://codemorf.tech)', 40, 750, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
