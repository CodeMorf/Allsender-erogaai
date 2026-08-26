import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  Search,
  CheckCheck
} from 'lucide-react';
import { ExpenseRecord, Organization, User } from '../types.ts';
import { nativeDevice } from '../lib/capacitor.ts';

interface ApprovalsViewProps {
  expenses: ExpenseRecord[];
  currentOrg: Organization;
  currentUser: User;
  onSelectExpense: (expense: ExpenseRecord) => void;
  onRefresh: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  expenses,
  currentOrg,
  currentUser,
  onSelectExpense,
  onRefresh
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Pending review items
  const pendingExpenses = expenses.filter(e => e.status === 'PENDIENTE_REVISION');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === pendingExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingExpenses.map(p => p.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessingBulk(true);
    nativeDevice.vibrate([40, 30, 40]);

    try {
      await Promise.all(
        selectedIds.map(id => 
          fetch(`/api/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'APROBADO',
              reviewed_by: currentUser.name,
              reviewed_at: new Date().toISOString()
            })
          })
        )
      );
      setSelectedIds([]);
      onRefresh();
    } catch (e) {
      console.error('Error in bulk approval:', e);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Bandeja de Revisión & Aprobación Contable
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
              {pendingExpenses.length} pendientes
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Valide los tickets capturados por los colaboradores antes de su integración definitiva en AllSender ERP y DGII 606.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={isProcessingBulk}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Aprobar {selectedIds.length} Comprobantes Seleccionados</span>
            </button>
          </div>
        )}
      </div>

      {/* Pending Items Table */}
      <div className="all-card rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {pendingExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500" />
            <div>
              <p className="font-bold text-base text-slate-800 dark:text-slate-200">¡Bandeja al Día!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">No hay erogaciones pendientes de aprobación en este momento.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 dark:bg-slate-950 text-slate-200 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pendingExpenses.length && pendingExpenses.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-3">RNC & NCF</th>
                  <th className="py-3 px-3">Clasificación</th>
                  <th className="py-3 px-3 text-right">Monto Total</th>
                  <th className="py-3 px-3 text-center">Confianza IA</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                {pendingExpenses.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectExpense(item)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-750/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{item.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{item.created_by_name}</td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-semibold">{item.supplier_name}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="font-bold text-blue-600 dark:text-blue-400">{item.ncf}</div>
                      <div className="text-slate-400">{item.supplier_rnc}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {item.classification}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      RD$ {item.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.ai_confidence_score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectExpense(item)}
                        className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
