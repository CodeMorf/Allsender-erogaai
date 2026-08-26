import React from 'react';
import { useApp } from '../context/AppContext.js';
import { ErogaLogo } from '../components/Logo.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ClassificationBadge } from '../components/ClassificationBadge.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { 
  Receipt, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Building, 
  ArrowUpRight, 
  Camera, 
  ShieldCheck, 
  FileSpreadsheet,
  BrainCircuit,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { 
    expenses = [], 
    organization, 
    currentUser, 
    openScanner, 
    setActiveView, 
    setSelectedExpense, 
    aiProviders = [] 
  } = useApp();

  const expenseList = Array.isArray(expenses) ? expenses : [];
  const totalSpent = expenseList.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.total_amount : 0), 0);
  const pendingReview = expenseList.filter(e => e.status === 'PENDIENTE_REVISION');
  const approvedExpenses = expenseList.filter(e => e.status === 'APROBADO' || e.status === 'SINCRONIZADO_ERP');
  const totalITBIS = expenseList.reduce((acc, e) => acc + (e.status !== 'RECHAZADO' ? e.itbis_amount : 0), 0);

  // Group by classification
  const classData = [
    { name: 'Gasto Operativo', value: expenseList.filter(e => e.classification === 'GASTO_OPERATIVO').reduce((a, b) => a + b.total_amount, 0), color: '#3B82F6' },
    { name: 'Costo de Venta', value: expenseList.filter(e => e.classification === 'COSTO_VENTA').reduce((a, b) => a + b.total_amount, 0), color: '#F97316' },
    { name: 'Compra Inventario', value: expenseList.filter(e => e.classification === 'COMPRA_INVENTARIO').reduce((a, b) => a + b.total_amount, 0), color: '#F59E0B' },
    { name: 'Activo Fijo', value: expenseList.filter(e => e.classification === 'ACTIVO_FIJO').reduce((a, b) => a + b.total_amount, 0), color: '#8B5CF6' }
  ];

  const recentExpenses = expenseList.slice(0, 5);

  const activeProvider = (Array.isArray(aiProviders) ? aiProviders : []).find(p => p.is_primary && p.is_active) || (Array.isArray(aiProviders) ? aiProviders[0] : null);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Welcome Banner with Dominican Quick Action Guide */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative platinum glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-400/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-slate-950/90 border border-slate-700/80 items-center justify-center p-1.5 shrink-0 shadow-xl shadow-slate-950/50">
              <ErogaLogo size={46} />
            </div>

            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600/60">
                  🇩🇴 República Dominicana • DGII
                </span>
                <span className="text-xs text-slate-400 font-mono">RNC: {organization?.rnc || '101-99882-1'}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Eroga<span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white">AI</span></span>
                <span className="text-slate-300 font-medium text-lg hidden md:inline">— Control Inteligente de Erogaciones</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Captura o sube cualquier comprobante fiscal dominicano (Gastos Menores, Facturas de Crédito Fiscal, Compras). La Inteligencia Artificial extrae RNC, NCF, ITBIS (18%) y prepara el reporte DGII 606 automáticamente.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => openScanner()}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 hover:from-white hover:to-slate-200 text-slate-900 font-black text-sm rounded-xl shadow-lg shadow-slate-950/30 transition-all active:scale-95 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-slate-900" />
              <span>📸 Escanear Factura Ahora</span>
            </button>
          </div>
        </div>

        {/* 3 Steps Dominican Beginner Guide */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-900 font-black flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span className="text-slate-300"><strong>Toma la foto</strong> o sube el comprobante fiscal.</span>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-900 font-black flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span className="text-slate-300">La IA <strong>calcula el ITBIS y NCF</strong> sin errores.</span>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-900 font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span className="text-slate-300"><strong>Descarga el 606</strong> o exporta a tu ERP.</span>
          </div>
        </div>
      </div>

      {/* Dominican Fast Test Bar for Novices */}
      <div className="all-card rounded-2xl p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              ¿Eres nuevo? Prueba en 1 Clic con Facturas Típicas Dominicanas:
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Haz clic en cualquiera para ver cómo la IA extrae los datos al instante
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => openScanner()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-xs transition-all text-left flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-xl">⛽</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Bomba Gasolina</p>
              <p className="text-[10px] text-slate-500">Exento ITBIS • B01</p>
            </div>
          </button>

          <button
            onClick={() => openScanner()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-xl">🍽️</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Restaurante</p>
              <p className="text-[10px] text-slate-500">10% Propina + 18%</p>
            </div>
          </button>

          <button
            onClick={() => openScanner()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-xs transition-all text-left flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-xl">💻</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Laptop / Cómputo</p>
              <p className="text-[10px] text-slate-500">Activo Fijo • Deprec.</p>
            </div>
          </button>

          <button
            onClick={() => openScanner()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-xs transition-all text-left flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-xl">🛒</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Supermercado</p>
              <p className="text-[10px] text-slate-500">Insumos y Cafetería</p>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Gastos */}
        <div className="all-card all-card-hover rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Erogaciones Mes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(totalSpent, 'DOP')}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{expenses.length} comprobantes registrados</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pendientes */}
        <div className="all-card all-card-hover rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pendientes de Revisión
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {pendingReview.length}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Requieren validación contable</span>
            </div>
          </div>
        </div>

        {/* Card 3: ITBIS Deducible */}
        <div className="all-card all-card-hover rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              ITBIS Deducible (18%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totalITBIS, 'DOP')}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Crédito fiscal listo para 606</span>
            </div>
          </div>
        </div>

        {/* Card 4: Motor de IA */}
        <div className="all-card all-card-hover rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Motor IA Principal
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeProvider?.name || 'Google Gemini Pro'}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeProvider?.selected_model} (Online)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: Classification Breakdown */}
        <div className="lg:col-span-8 all-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Distribución por Clasificación Contable
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gasto Operativo, Costo de Venta, Inventario y Activos Fijos
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val) => `RD$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(val, 'DOP'), 'Monto']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart / DGII Status Summary */}
        <div className="lg:col-span-4 all-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Estado de Comprobantes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Flujo de aprobación para AllSender ERP
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Aprobados / Listos</span>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">{approvedExpenses.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <span className="text-amber-800 dark:text-amber-300 font-semibold">Pendientes Revisión</span>
                <span className="font-bold text-amber-900 dark:text-amber-200">{pendingReview.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Borradores</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {expenses.filter(e => e.status === 'BORRADOR').length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveView('dgii-606')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Generar Reporte 606</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="all-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Últimas Erogaciones Registradas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auditoría en tiempo real con NCF y RNC verificado
            </p>
          </div>
          <button
            onClick={() => setActiveView('expenses')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Comprobante (NCF)</th>
                <th className="p-3">Proveedor & RNC</th>
                <th className="p-3">Clasificación</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-right">Total RD$</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentExpenses.map(exp => (
                <tr 
                  key={exp.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedExpense(exp)}
                >
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {exp.ncf}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{exp.supplier_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">RNC: {exp.supplier_rnc}</div>
                  </td>
                  <td className="p-3">
                    <ClassificationBadge classification={exp.classification} />
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    {formatDate(exp.date)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(exp.total_amount, exp.currency)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={exp.status} />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExpense(exp);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold text-[11px]"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
