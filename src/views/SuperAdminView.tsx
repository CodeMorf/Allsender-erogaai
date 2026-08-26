import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  ShieldAlert, 
  Building, 
  Cpu, 
  Activity, 
  FileText, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Users, 
  Zap, 
  Lock, 
  Server, 
  Globe, 
  DollarSign, 
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AIConfigurationView } from './AIConfigurationView.js';

export const SuperAdminView: React.FC = () => {
  const { 
    organizations, 
    expenses, 
    aiProviders, 
    setPortal, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'tenants' | 'ai-providers' | 'telemetry' | 'audit'>('tenants');
  const [searchTerm, setSearchTerm] = useState('');

  const totalProcessedInvoices = expenses.length;
  const totalTokens = aiProviders.reduce((sum, p) => sum + (p.total_tokens || 0), 0);
  const totalAiRequests = aiProviders.reduce((sum, p) => sum + (p.total_requests || 0), 0);

  const filteredOrgs = organizations.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.rnc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="super-admin-portal" className="space-y-6">
      {/* Super Admin Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-500/30 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                <span>Panel Super Administrador SaaS</span>
              </span>
              <span className="text-xs text-indigo-300">•</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistemas Operativos (100% Uptime)
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Gestión Global de Plataforma & Multinquilinos
            </h1>
            <p className="text-xs text-indigo-200/80 max-w-2xl">
              Administra todas las empresas clientes de ErogaAI, las claves maestras de IA (Gemini, OpenAI, Groq) y supervisa el consumo de tokens y facturas procesadas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPortal('company')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Portal Empresa</span>
            </button>
          </div>
        </div>

        {/* Global SaaS KPIs */}
        <div className="relative z-10 mt-6 pt-5 border-t border-indigo-800/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-indigo-900/40 space-y-1">
            <span className="text-indigo-300 text-[11px]">Empresas Inquilinas</span>
            <p className="text-xl font-bold text-white">{organizations.length} <span className="text-xs font-normal text-indigo-300">Clientes</span></p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-indigo-900/40 space-y-1">
            <span className="text-indigo-300 text-[11px]">Facturas Extraídas</span>
            <p className="text-xl font-bold text-white">{totalProcessedInvoices} <span className="text-xs font-normal text-indigo-300">docs</span></p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-indigo-900/40 space-y-1">
            <span className="text-indigo-300 text-[11px]">Peticiones IA OCR</span>
            <p className="text-xl font-bold text-emerald-400">{totalAiRequests} <span className="text-xs font-normal text-indigo-300">calls</span></p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-indigo-900/40 space-y-1">
            <span className="text-indigo-300 text-[11px]">Tokens Procesados</span>
            <p className="text-xl font-bold text-indigo-300">{(totalTokens / 1000).toFixed(1)}k <span className="text-xs font-normal text-indigo-400">tokens</span></p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Empresas Clientes ({organizations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-providers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ai-providers'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Motores de IA & Claves ({aiProviders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Telemetría & Tokens</span>
        </button>
      </div>

      {/* Tab 1: Tenants List */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa por nombre o RNC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>
            <button
              onClick={() => showToast('info', 'Alta de Empresa', 'Formulario para aprovisionar nuevo inquilino SaaS.')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700"
            >
              <span>+ Alta Inquilino</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrgs.map((org) => (
              <div key={org.id} className="all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-extrabold text-base flex items-center justify-center">
                      {org.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{org.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>RNC: {org.rnc}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-semibold">{org.plan}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Activa
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1.5 border border-slate-200/50 dark:border-slate-700/40">
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] truncate">
                    📍 {org.address || 'Santo Domingo, República Dominicana'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    📞 {org.phone || '+1 (809) 567-8900'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-400">ID: {org.id}</span>
                  <button
                    onClick={() => {
                      setPortal('company');
                      showToast('info', 'Accediendo como Inquilino', `Has entrado al panel de ${org.name}`);
                    }}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    <span>Entrar a Panel Empresa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: AI Configuration View (Reuse rich view) */}
      {activeTab === 'ai-providers' && (
        <AIConfigurationView />
      )}

      {/* Tab 3: Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="all-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Desglose de Tráfico y Rendimiento por Motor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {aiProviders.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {p.total_requests} <span className="text-xs font-normal text-slate-500">llamadas</span>
                  </p>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>Tokens: {p.total_tokens.toLocaleString()}</p>
                    <p>Modelo: <span className="font-mono text-blue-600 dark:text-blue-400">{p.selected_model}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
