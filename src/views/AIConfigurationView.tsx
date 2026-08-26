import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { AIProviderConfig, AIProviderType } from '../types.js';
import { 
  BrainCircuit, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Power, 
  Trash2, 
  RotateCw, 
  ShieldCheck, 
  Clock, 
  Plus, 
  Cpu,
  Layers,
  Zap,
  Info
} from 'lucide-react';

export const AIConfigurationView: React.FC = () => {
  const { 
    aiProviders, 
    saveAIProvider, 
    testAIProvider, 
    showToast 
  } = useApp();

  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSecondary, setIsSecondary] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleOpenEdit = (prov: AIProviderConfig) => {
    setEditingProvider(prov);
    setApiKeyInput('');
    setSelectedModel(prov.selected_model);
    setIsPrimary(prov.is_primary);
    setIsSecondary(prov.is_secondary_fallback);
  };

  const handleSave = async () => {
    if (!editingProvider) return;
    try {
      await saveAIProvider({
        provider_type: editingProvider.provider_type,
        name: editingProvider.name,
        selected_model: selectedModel,
        is_primary: isPrimary,
        is_secondary_fallback: isSecondary,
        api_key: apiKeyInput.trim() !== '' ? apiKeyInput.trim() : undefined,
        is_active: editingProvider.is_active
      });
      setEditingProvider(null);
    } catch (err: any) {
      showToast('error', 'Error al Guardar', err.message);
    }
  };

  const handleToggleActive = async (prov: AIProviderConfig) => {
    try {
      await saveAIProvider({
        provider_type: prov.provider_type,
        name: prov.name,
        selected_model: prov.selected_model,
        is_active: !prov.is_active,
        is_primary: prov.is_primary,
        is_secondary_fallback: prov.is_secondary_fallback
      });
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await testAIProvider(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleSetPrimary = async (prov: AIProviderConfig) => {
    try {
      await saveAIProvider({
        provider_type: prov.provider_type,
        is_primary: true,
        is_active: true
      });
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  return (
    <div id="ai-settings-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Configuración → Inteligencia Artificial
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
              Arquitectura Multi-LLM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administra proveedores de IA, llaves criptográficas seguras, modelos OCR y balanceo de carga para tu organización
          </p>
        </div>
      </div>

      {/* Security Banner per Specification */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-bold">Aislamiento y Cifrado de Claves API (SaaS Multi-Inquilino):</p>
          <p className="text-blue-800/90 dark:text-blue-300/90">
            Las claves se guardan cifradas con AES-256 en el backend y <strong>nunca se exponen en el frontend ni en respuestas API</strong>. Se muestra únicamente una versión enmascarada parcial para referencia de auditoría.
          </p>
        </div>
      </div>

      {/* AI Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiProviders.map(prov => {
          const isTesting = testingId === prov.id;
          return (
            <div
              key={prov.id}
              className={`all-card rounded-2xl p-5 flex flex-col justify-between transition-all ${
                prov.is_primary ? 'ring-2 ring-blue-500/80 shadow-md' : ''
              }`}
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                      prov.provider_type === 'GEMINI' ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' :
                      prov.provider_type === 'GROQ' ? 'bg-gradient-to-tr from-orange-500 to-amber-600' :
                      prov.provider_type === 'OPENAI' ? 'bg-gradient-to-tr from-emerald-600 to-teal-700' :
                      'bg-gradient-to-tr from-purple-600 to-pink-600'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {prov.name}
                        </h2>
                        {prov.is_primary && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                            Principal
                          </span>
                        )}
                        {prov.is_secondary_fallback && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Respaldo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Modelo: <span className="font-semibold text-slate-800 dark:text-slate-200">{prov.selected_model}</span>
                      </p>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <button
                    onClick={() => handleToggleActive(prov)}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      prov.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800'
                    }`}
                    title={prov.is_active ? 'Desactivar proveedor' : 'Activar proveedor'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{prov.is_active ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </div>

                {/* Masked Key Display */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <KeyRound className="w-3.5 h-3.5" /> Clave API Registrada:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                      {prov.masked_key}
                    </span>
                  </div>

                  {prov.last_test_message && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{prov.last_test_message}</span>
                    </div>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peticiones</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{prov.total_requests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tokens IA</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{(prov.total_tokens / 1000).toFixed(1)}k</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estado</span>
                    <span className={`font-bold ${prov.status === 'ONLINE' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {prov.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleTest(prov.id)}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {!prov.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(prov)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
                    >
                      Hacer Principal
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(prov)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Configurar {editingProvider.name}
              </h3>
              <button
                onClick={() => setEditingProvider(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* API Key Input */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reemplazar / Ingresar Clave API *
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Pegar nueva API Key (ej: gsk_..., sk-..., AIza...)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Clave actual: {editingProvider.masked_key}
                </p>
              </div>

              {/* Model selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Modelo de Inteligencia Artificial *
                </label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  aria-label="Seleccionar Modelo de Inteligencia Artificial"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {(editingProvider.available_models || [editingProvider.selected_model]).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={e => {
                      setIsPrimary(e.target.checked);
                      if (e.target.checked) setIsSecondary(false);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Definir como Proveedor Principal de la Organización
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSecondary}
                    onChange={e => {
                      setIsSecondary(e.target.checked);
                      if (e.target.checked) setIsPrimary(false);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Definir como Proveedor Secundario de Respaldo (Fallback)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingProvider(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
