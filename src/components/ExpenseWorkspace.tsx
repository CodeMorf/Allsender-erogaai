import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Save, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  AlertTriangle, 
  Sparkles, 
  Building2, 
  FileText, 
  ExternalLink,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { 
  ExpenseRecord, 
  ExpenseStatus, 
  ExpenseClassification, 
  NcfType, 
  User, 
  Organization, 
  Company, 
  Branch 
} from '../types.ts';
import { nativeDevice } from '../lib/capacitor.ts';

interface ExpenseWorkspaceProps {
  expense: ExpenseRecord;
  currentOrg: Organization;
  currentUser: User;
  companies: Company[];
  branches: Branch[];
  onBack: () => void;
  onUpdateExpense: (updated: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpenseWorkspace: React.FC<ExpenseWorkspaceProps> = ({
  expense,
  currentOrg,
  currentUser,
  companies,
  branches,
  onBack,
  onUpdateExpense,
  onDeleteExpense
}) => {
  // Form State
  const [supplierName, setSupplierName] = useState(expense.supplier_name);
  const [supplierRnc, setSupplierRnc] = useState(expense.supplier_rnc);
  const [ncf, setNcf] = useState(expense.ncf);
  const [ncfType, setNcfType] = useState<NcfType>(expense.ncf_type);
  const [date, setDate] = useState(expense.date);
  const [classification, setClassification] = useState<ExpenseClassification>(expense.classification);
  const [expenseCategory, setExpenseCategory] = useState(expense.expense_category);
  const [subtotal, setSubtotal] = useState(expense.subtotal);
  const [itbisAmount, setItbisAmount] = useState(expense.itbis_amount);
  const [legalTipAmount, setLegalTipAmount] = useState(expense.legal_tip_amount || 0);
  const [totalAmount, setTotalAmount] = useState(expense.total_amount);
  const [paymentMethod, setPaymentMethod] = useState(expense.payment_method);
  const [companyId, setCompanyId] = useState(expense.company_id);
  const [branchId, setBranchId] = useState(expense.branch_id);
  const [status, setStatus] = useState<ExpenseStatus>(expense.status);
  const [approvalNotes, setApprovalNotes] = useState(expense.approval_notes || '');
  const [lineItems, setLineItems] = useState(expense.line_items || []);

  // Image viewer zoom & rotation
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Permission checks
  const canApprove = ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR'].includes(currentUser.role);

  const handleSave = async (newStatus?: ExpenseStatus) => {
    nativeDevice.vibrate(40);
    const targetStatus = newStatus || status;
    
    const updated: ExpenseRecord = {
      ...expense,
      company_id: companyId,
      branch_id: branchId,
      date,
      supplier_name: supplierName,
      supplier_rnc: supplierRnc,
      ncf,
      ncf_type: ncfType,
      classification,
      expense_category: expenseCategory,
      subtotal: Number(subtotal),
      itbis_amount: Number(itbisAmount),
      legal_tip_amount: Number(legalTipAmount),
      total_amount: Number(totalAmount),
      payment_method: paymentMethod,
      status: targetStatus,
      approval_notes: approvalNotes,
      reviewed_by: targetStatus === 'APROBADO' ? currentUser.name : expense.reviewed_by,
      reviewed_at: targetStatus === 'APROBADO' ? new Date().toISOString() : expense.reviewed_at,
      line_items: lineItems,
      updated_at: new Date().toISOString()
    };

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (data.expense) {
        onUpdateExpense(data.expense);
      }
    } catch (e) {
      console.error('Error updating expense:', e);
    }
  };

  const handleApprove = () => {
    setStatus('APROBADO');
    handleSave('APROBADO');
  };

  const handleReject = () => {
    setStatus('RECHAZADO');
    handleSave('RECHAZADO');
  };

  // Math Validation Check
  const expectedTotal = Number(subtotal) + Number(itbisAmount) + Number(legalTipAmount);
  const hasMathMismatch = Math.abs(expectedTotal - Number(totalAmount)) > 1.0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            title="Volver al listado"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
                {expense.supplier_name}
              </h1>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {expense.ncf || 'Sin NCF'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registrado por {expense.created_by_name} • Fecha: {expense.date}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canApprove && status === 'PENDIENTE_REVISION' && (
            <>
              <button
                onClick={handleReject}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Rechazar</span>
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar Erogación</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleSave()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Workspace (50% Receipt Image Viewer, 50% Fiscal Data & Approval) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Receipt Image Viewer (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[680px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Comprobante Original
              </span>

              {/* Zoom & Rotation toolbar */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-semibold text-slate-500 w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  title="Rotar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Viewer Stage */}
            <div className="flex-1 bg-slate-950 rounded-xl overflow-auto flex items-center justify-center p-2 relative border border-slate-800">
              {expense.receipt_image_url ? (
                <img
                  src={expense.receipt_image_url}
                  alt="Factura"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain rounded select-none shadow-2xl"
                />
              ) : (
                <div className="text-center text-slate-400 p-6">
                  <FileText className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs">No hay imagen adjunta para este comprobante.</p>
                </div>
              )}
            </div>

            {/* AI OCR Transcription snippet */}
            {expense.ocr_raw_text && (
              <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  Texto Detectado por OCR:
                </div>
                <pre className="font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                  {expense.ocr_raw_text}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Editable Fiscal Details & Approval Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            
            {/* Status & Reviewer Summary */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Estado Actual:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {status}
                </span>
              </div>

              {expense.reviewed_by && (
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Revisado por: <strong>{expense.reviewed_by}</strong> ({new Date(expense.reviewed_at || '').toLocaleDateString('es-DO')})
                </div>
              )}
            </div>

            {/* Math Discrepancy Warning */}
            {hasMathMismatch && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Advertencia Matemática:</strong> Subtotal ({subtotal}) + ITBIS ({itbisAmount}) + Propina ({legalTipAmount}) = {expectedTotal.toFixed(2)} RD$, pero el Total es {totalAmount} RD$.
                </div>
              </div>
            )}

            {/* Editable Form */}
            <div className="space-y-4 text-xs">
              
              {/* Row 1: Company & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Empresa:</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sucursal:</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Supplier & RNC */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Proveedor:</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">RNC / Cédula:</label>
                  <input
                    type="text"
                    value={supplierRnc}
                    onChange={(e) => setSupplierRnc(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Row 3: NCF, Tipo, Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">NCF:</label>
                  <input
                    type="text"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold text-blue-700 dark:text-blue-400 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo NCF:</label>
                  <select
                    value={ncfType}
                    onChange={(e) => setNcfType(e.target.value as NcfType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="B01">B01 - Crédito Fiscal</option>
                    <option value="B02">B02 - Consumo Final</option>
                    <option value="E31">E31 - e-CF Crédito Fiscal</option>
                    <option value="E32">E32 - e-CF Consumo</option>
                    <option value="B14">B14 - Régimen Especial</option>
                    <option value="B15">B15 - Gubernamental</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Row 4: Classification & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clasificación:</label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as ExpenseClassification)}
                    className="w-full px-3 py-2 font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="GASTO_OPERATIVO">Gasto Operativo</option>
                    <option value="COSTO_VENTA">Costo de Venta</option>
                    <option value="COMPRA_INVENTARIO">Compra para Inventario</option>
                    <option value="ACTIVO_FIJO">Activo Fijo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría:</label>
                  <input
                    type="text"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Financial Amounts Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Subtotal:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotal}
                    onChange={(e) => setSubtotal(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">ITBIS (18%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itbisAmount}
                    onChange={(e) => setItbisAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Propina Legal:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={legalTipAmount}
                    onChange={(e) => setLegalTipAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">Total General:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono font-black bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-900 dark:text-blue-100"
                  />
                </div>
              </div>

              {/* Approval Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  Notas de Aprobación / Revisión:
                </label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Escriba comentarios para el departamento contable o solicitante..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onDeleteExpense(expense.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Registro</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-sm transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
