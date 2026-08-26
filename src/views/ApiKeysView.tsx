import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  Power, 
  AlertTriangle, 
  Clock, 
  Building2, 
  MapPin, 
  Activity, 
  FileCode2, 
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Code
} from 'lucide-react';
import { ApiKey, ApiKeyScope } from '../types.ts';

export const ApiKeysView: React.FC = () => {
  const { 
    apiKeys, 
    apiKeyScopes, 
    apiKeyLogs, 
    isLoadingApiKeys, 
    fetchApiKeys, 
    fetchApiKeyScopes, 
    fetchApiKeyLogs,
    createApiKey, 
    regenerateApiKey, 
    toggleApiKey, 
    revokeApiKey,
    companies,
    branches,
    setActiveView
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    company_id: companies[0]?.id || '',
    branch_id: '',
    scopes: ['read:expenses', 'write:expenses', 'extract:receipts'],
    expires_in_days: '365'
  });

  // Modal to show the newly generated raw API key (ONE TIME ONLY)
  const [createdRawKeyModal, setCreatedRawKeyModal] = useState<{
    keyName: string;
    rawKey: string;
    warning: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [regeneratingKeyId, setRegeneratingKeyId] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
    fetchApiKeyScopes();
    fetchApiKeyLogs();
  }, []);

  const handleCopyRawKey = () => {
    if (createdRawKeyModal?.rawKey) {
      navigator.clipboard.writeText(createdRawKeyModal.rawKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyData.name.trim() || !newKeyData.company_id || newKeyData.scopes.length === 0) {
      return;
    }

    let expiresAt: string | null = null;
    if (newKeyData.expires_in_days !== 'never') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(newKeyData.expires_in_days, 10));
      expiresAt = d.toISOString();
    }

    const res = await createApiKey({
      name: newKeyData.name.trim(),
      company_id: newKeyData.company_id,
      branch_id: newKeyData.branch_id || undefined,
      scopes: newKeyData.scopes,
      expires_at: expiresAt
    });

    if (res.rawKey) {
      setIsCreateModalOpen(false);
      setCreatedRawKeyModal({
        keyName: newKeyData.name.trim(),
        rawKey: res.rawKey,
        warning: res.warning || 'Guarde esta clave en un lugar seguro. Por motivos de seguridad, no se volverá a mostrar nunca más.'
      });
      // Reset form
      setNewKeyData({
        name: '',
        company_id: companies[0]?.id || '',
        branch_id: '',
        scopes: ['read:expenses', 'write:expenses', 'extract:receipts'],
        expires_in_days: '365'
      });
    }
  };

  const handleRegenerate = async (id: string) => {
    const key = apiKeys.find(k => k.id === id);
    const res = await regenerateApiKey(id);
    setRegeneratingKeyId(null);

    if (res.rawKey && key) {
      setCreatedRawKeyModal({
        keyName: `${key.name} (Regenerada)`,
        rawKey: res.rawKey,
        warning: 'La clave previa ha sido revocada inmediatamente. Guarde su nueva API Key.'
      });
    }
  };

  const toggleScope = (scopeId: string) => {
    setNewKeyData(prev => {
      const exists = prev.scopes.includes(scopeId);
      const nextScopes = exists ? prev.scopes.filter(s => s !== scopeId) : [...prev.scopes, scopeId];
      return { ...prev, scopes: nextScopes };
    });
  };

  return (
    <div id="api-keys-view" className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Gestión de API Keys & Microservicio
            </h1>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              SHA-256 Hasheado
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Emita credenciales criptográficas seguras para conectar AllSender ERP, CRMs, bots o sistemas externos con ErogaAI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-view-api-docs"
            onClick={() => setActiveView('api-docs')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-blue-600" />
            <span>Ver Documentación API</span>
          </button>

          <button
            id="btn-generate-api-key"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generar Nueva API Key</span>
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="rounded-2xl p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-blue-950 dark:text-blue-200">
            Arquitectura de Seguridad Zero-Plaintext
          </p>
          <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Las claves se almacenan exclusivamente como hashes criptográficos <strong>SHA-256</strong>. La API Key en texto plano solo se entrega una vez durante la creación o regeneración. Todas las llamadas externas deben incluir el header <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono font-bold">X-API-Key: eroga_live_...</code>.
          </p>
        </div>
      </div>

      {/* API Keys Table / Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Claves Activas ({apiKeys.length})
          </span>
          <span className="text-xs text-slate-400">
            Autenticación Bearer & Header
          </span>
        </div>

        {apiKeys.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Key className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No tienes API Keys generadas.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Genera una API Key para conectar AllSender u otros sistemas externos y utilizar el motor de OCR y contabilidad como módulo externo.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generar API Key</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nombre / Clave</th>
                    <th className="py-3 px-3">Empresa / Sede</th>
                    <th className="py-3 px-3">Permisos (Scopes)</th>
                    <th className="py-3 px-3">Peticiones</th>
                    <th className="py-3 px-3">Último Uso</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {apiKeys.map(key => {
                    const comp = companies.find(c => c.id === key.company_id);
                    const branch = branches.find(b => b.id === key.branch_id);

                    return (
                      <tr key={key.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {key.name}
                            </div>
                            <div className="font-mono text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {key.key_prefix}... (Hasheada)
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold">
                            {comp?.name || 'Toda la Organización'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {branch?.name || 'Todas las sedes'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {key.scopes.map(s => (
                              <span 
                                key={s}
                                className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {(key.request_count ?? key.total_requests ?? 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Sin peticiones'}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => toggleApiKey(key.id, !key.is_active)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              key.is_active
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span>{key.is_active ? 'Activa' : 'Pausada'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Regenerar clave (cambia token inmediatamente)"
                              onClick={() => setRegeneratingKeyId(key.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Revocar permanentemente"
                              onClick={() => setRevokingKeyId(key.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* API Logs & Usage History */}
      <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Registro de Solicitudes API Recientes
          </h3>
          <span className="text-xs text-slate-400">
            Últimas llamadas entrantes
          </span>
        </div>

        {apiKeyLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No se registran solicitudes entrantes recientes vía API Key.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {apiKeyLogs.map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    log.status_code < 300 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}>
                    {log.status_code} {log.method}
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{log.endpoint}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span>{log.duration_ms} ms</span>
                  <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Crear Nueva API Key */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Generar Nueva API Key
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Identificador de la Aplicación *
                </label>
                <input
                  type="text"
                  required
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  placeholder="Ej. Integración AllSender ERP Producción"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Empresa Filial *
                  </label>
                  <select
                    required
                    value={newKeyData.company_id}
                    onChange={(e) => setNewKeyData({ ...newKeyData, company_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (RNC: {c.rnc})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sucursal Específica (Opcional)
                  </label>
                  <select
                    value={newKeyData.branch_id}
                    onChange={(e) => setNewKeyData({ ...newKeyData, branch_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas las sucursales</option>
                    {branches
                      .filter(b => !newKeyData.company_id || b.company_id === newKeyData.company_id)
                      .map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vigencia de la Clave
                </label>
                <select
                  value={newKeyData.expires_in_days}
                  onChange={(e) => setNewKeyData({ ...newKeyData, expires_in_days: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="90">90 días (Recomendado)</option>
                  <option value="180">180 días (6 meses)</option>
                  <option value="365">1 año (365 días)</option>
                  <option value="never">Sin expiración</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Permisos y Alcances (Scopes) *
                </label>
                <div className="space-y-2">
                  {apiKeyScopes.map(scope => {
                    const isChecked = newKeyData.scopes.includes(scope.id);
                    return (
                      <div 
                        key={scope.id}
                        onClick={() => toggleScope(scope.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-mono font-bold text-[11px] block">{scope.id}</span>
                          <span className="text-[11px] opacity-80">{scope.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Generar y Obtener Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Visualización de API Key (UNA SOLA VEZ) */}
      {createdRawKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-emerald-500 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                API Key Generada Exitosamente: {createdRawKeyModal.keyName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Copie su API Key ahora. Por razones de seguridad criptográfica, <strong>no volverá a mostrarse</strong> una vez cerrada esta ventana.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 font-mono text-xs break-all flex items-center justify-between gap-2">
              <span className="select-all font-bold text-emerald-400">{createdRawKeyModal.rawKey}</span>
              <button
                id="btn-copy-raw-api-key"
                onClick={handleCopyRawKey}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shrink-0 cursor-pointer flex items-center gap-1 text-xs"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                {createdRawKeyModal.warning}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedRawKeyModal(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                He copiado y guardado la clave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACION DE REGENERACION */}
      {regeneratingKeyId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ¿Regenerar esta API Key?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                La clave anterior dejará de funcionar de inmediato en todos los sistemas integrados. Se generará un nuevo token.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRegeneratingKeyId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRegenerate(regeneratingKeyId)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Confirmar y Regenerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACION DE REVOCACION */}
      {revokingKeyId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ¿Revocar permanentemente esta API Key?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Esta acción es irreversible. Todos los servicios o llamadas API con esta clave serán denegadas (HTTP 401).
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRevokingKeyId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await revokeApiKey(revokingKeyId);
                  setRevokingKeyId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Revocar Clave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
