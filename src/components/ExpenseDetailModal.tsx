import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { StatusBadge } from './StatusBadge.js';
import { ClassificationBadge } from './ClassificationBadge.js';
import { formatCurrency, formatDate, validateRNC, validateNCF } from '../utils/formatters.js';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  Building2, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';

export const ExpenseDetailModal: React.FC = () => {
  const { 
    selectedExpense, 
    setSelectedExpense, 
    updateExpenseStatus, 
    deleteExpense, 
    currentUser, 
    syncWithAllSenderERP,
    showToast 
  } = useApp();

  const [notes, setNotes] = useState(selectedExpense?.approval_notes || '');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!selectedExpense) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await updateExpenseStatus(selectedExpense.id, 'APROBADO', notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes || notes.trim() === '') {
      showToast('warning', 'Motivo Requerido', 'Por favor especifique la razón del rechazo en las notas de revisión.');
      return;
    }
    setIsProcessing(true);
    try {
      await updateExpenseStatus(selectedExpense.id, 'RECHAZADO', notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncERP = async () => {
    setIsProcessing(true);
    try {
      await syncWithAllSenderERP([selectedExpense.id]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('¿Está seguro de eliminar permanentemente este comprobante fiscal?')) {
      await deleteExpense(selectedExpense.id);
    }
  };

  const rncVal = validateRNC(selectedExpense.supplier_rnc);
  const ncfVal = validateNCF(selectedExpense.ncf);

  const canApproveOrReject = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ACCOUNTANT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="expense-detail-container"
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {selectedExpense.ncf}
                </h3>
                <StatusBadge status={selectedExpense.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedExpense.supplier_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedExpense(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Cerrar modal de detalles"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Datos del Emisor
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedExpense.supplier_name}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 dark:text-slate-300 font-mono">
                <span>RNC: {selectedExpense.supplier_rnc}</span>
                {rncVal.isValid && <span className="text-emerald-500 font-bold text-[10px]">✓ DGII</span>}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Clasificación & Tipo
              </span>
              <div className="mb-1.5">
                <ClassificationBadge classification={selectedExpense.classification} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedExpense.expense_category || 'Sin categoría'}
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                Monto Total Facturado
              </span>
              <p className="text-lg font-extrabold text-blue-900 dark:text-blue-200 font-mono">
                {formatCurrency(selectedExpense.total_amount, selectedExpense.currency)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>ITBIS: {formatCurrency(selectedExpense.itbis_amount, 'DOP')}</span>
                <span>Neto: {formatCurrency(selectedExpense.subtotal, 'DOP')}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Desglose de Bienes y Servicios
            </h4>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5 w-16 text-center">Cant.</th>
                    <th className="p-2.5 w-28 text-right">Precio Unit.</th>
                    <th className="p-2.5 w-20 text-center">ITBIS %</th>
                    <th className="p-2.5 w-28 text-right">Total RD$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {(selectedExpense.line_items || []).map(li => (
                    <tr key={li.id}>
                      <td className="p-2.5 text-slate-800 dark:text-slate-200 font-medium">
                        {li.description}
                      </td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                        {li.quantity}
                      </td>
                      <td className="p-2.5 text-right text-slate-600 dark:text-slate-400 font-mono">
                        {formatCurrency(li.unit_price, 'DOP')}
                      </td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                        {li.itbis_rate}%
                      </td>
                      <td className="p-2.5 text-right text-slate-900 dark:text-slate-100 font-bold font-mono">
                        {formatCurrency(li.total, 'DOP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Intelligence & Audit Trail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Verificación automática
              </span>
              <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                <p>• Procesado automáticamente: <strong className="text-slate-900 dark:text-slate-100">Sí</strong></p>
                <p>• Nivel de lectura: <strong className="text-emerald-600">{selectedExpense.ai_confidence_score}%</strong></p>
                <p>• Validador DGII: {ncfVal.message}</p>
                <p>• Registrado por: {selectedExpense.created_by_name}</p>
              </div>
            </div>

            {selectedExpense.receipt_image_url && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Fotografía Adjunta del Ticket
                </span>
                <div className="relative h-28 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 flex items-center justify-center">
                  <img
                    src={selectedExpense.receipt_image_url}
                    alt="Ticket"
                    className="max-h-28 w-auto object-contain"
                  />
                  <a
                    href={selectedExpense.receipt_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-white rounded text-[10px] flex items-center gap-1 hover:bg-black"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver Completa
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Review Notes Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Notas de Revisión / Aprobación
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Escriba comentarios para el solicitante o equipo contable..."
              rows={2}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {selectedExpense.reviewed_by && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Última revisión por: <strong>{selectedExpense.reviewed_by}</strong> ({formatDate(selectedExpense.reviewed_at || '')})
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>

          <div className="flex items-center gap-2.5">
            {canApproveOrReject && selectedExpense.status !== 'APROBADO' && selectedExpense.status !== 'SINCRONIZADO_ERP' && (
              <>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 rounded-lg"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rechazar</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Aprobar Comprobante</span>
                </button>
              </>
            )}

            {selectedExpense.status === 'APROBADO' && (
              <button
                onClick={handleSyncERP}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Sincronizar con AllSender ERP</span>
              </button>
            )}

            {selectedExpense.status === 'SINCRONIZADO_ERP' && (
              <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>Sync ID: {selectedExpense.all_sender_sync_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
