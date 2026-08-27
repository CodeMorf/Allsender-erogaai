import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  FileText,
  Filter,
  ArrowDownToLine
} from 'lucide-react';

export const DGIIReportView: React.FC = () => {
  const { organization, expenses, showToast } = useApp();
  const [period, setPeriod] = useState(() => new Date().toISOString().substring(0, 7));
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/dgii-606?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [expenses, period]);

  const handleDownloadTXT = () => {
    if (!reportData || !reportData.records) return;
    // Format official 606 text structure (pipe or fixed columns)
    const headerLine = `606|${organization?.rnc?.replace(/-/g, '') || '101000001'}|${period.replace('-', '')}|${reportData.records.length}`;
    const recordLines = reportData.records.map((r: any) => 
      `${r.rnc_cedula}|${r.tipo_id}|${r.tipo_bienes_servicios}|${r.ncf}|${r.ncf_modificado}|${r.fecha_comprobante}|${r.fecha_pago}|${Number(r.monto_servicios).toFixed(2)}|${Number(r.monto_bienes).toFixed(2)}|${Number(r.total_monto_facturado).toFixed(2)}|${Number(r.itbis_facturado).toFixed(2)}|0.00|0.00|0.00|${Number(r.itbis_facturado).toFixed(2)}|0.00|0.00||${r.forma_pago}`
    );

    const fullContent = [headerLine, ...recordLines].join('\r\n');
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `606_${organization?.rnc?.replace(/-/g, '') || '101000001'}_${period.replace('-', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Formato 606 Generado', 'Archivo .TXT oficial listo para subir a la Oficina Virtual DGII.');
  };

  const handleDownloadPDF = () => {
    window.open(`/api/reports/dgii-606/pdf?period=${period}`, '_blank');
  };

  const handleDownloadExcel = () => {
    window.open(`/api/reports/dgii-606/excel?period=${period}`, '_blank');
  };

  return (
    <div id="dgii-report-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Formato de Compras y Gastos (DGII 606)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generación y validación del reporte tributario mensual para la Dirección General de Impuestos Internos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleDownloadTXT}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar .TXT Oficial</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="all-card rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Comprobantes Válidos
          </span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {reportData?.total_records || 0}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Con NCF B01 / E31 aprobados</span>
        </div>

        <div className="all-card rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Facturado
          </span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {formatCurrency(reportData?.total_amount || 0, 'DOP')}
          </p>
          <span className="text-[11px] text-slate-500">Monto total deducible</span>
        </div>

        <div className="all-card rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            ITBIS Llevado al Costo / Deducible
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(reportData?.total_itbis || 0, 'DOP')}
          </p>
          <span className="text-[11px] text-slate-500">Crédito fiscal adelantar</span>
        </div>
      </div>

      {/* Table Preview */}
      <div className="all-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Vista Previa de Estructura 606
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            RNC Contribuyente: {organization?.rnc}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase">
              <tr>
                <th className="p-2.5">RNC / Cédula</th>
                <th className="p-2.5">Tipo Bien</th>
                <th className="p-2.5">NCF</th>
                <th className="p-2.5">Fecha</th>
                <th className="p-2.5 text-right">Servicios</th>
                <th className="p-2.5 text-right">Bienes</th>
                <th className="p-2.5 text-right">Total Facturado</th>
                <th className="p-2.5 text-right">ITBIS</th>
                <th className="p-2.5 text-center">Forma Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(reportData?.records || []).map((rec: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold">{rec.rnc_cedula}</td>
                  <td className="p-2.5 text-center">{rec.tipo_bienes_servicios}</td>
                  <td className="p-2.5 text-blue-600 dark:text-blue-400 font-bold">{rec.ncf}</td>
                  <td className="p-2.5">{rec.fecha_comprobante}</td>
                  <td className="p-2.5 text-right">{formatCurrency(rec.monto_servicios, 'DOP')}</td>
                  <td className="p-2.5 text-right">{formatCurrency(rec.monto_bienes, 'DOP')}</td>
                  <td className="p-2.5 text-right font-bold">{formatCurrency(rec.total_monto_facturado, 'DOP')}</td>
                  <td className="p-2.5 text-right text-emerald-600">{formatCurrency(rec.itbis_facturado, 'DOP')}</td>
                  <td className="p-2.5 text-center">{rec.forma_pago}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
