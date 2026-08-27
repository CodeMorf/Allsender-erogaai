import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Building2, MapPin, FileText, Cpu, Users, RefreshCw, Camera, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { organization, showToast, openScanner } = useApp();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State: Company Details
  const [companyName, setCompanyName] = useState(organization?.name || 'Mi Empresa Principal SRL');
  const [rnc, setRnc] = useState(organization?.rnc || '131-89241-2');
  const [address, setAddress] = useState('Av. Winston Churchill #1099, Santo Domingo, D.N.');

  // Step 2 State: Branch
  const [branchName, setBranchName] = useState('Sede Central');
  const [branchCode, setBranchCode] = useState('SED-01');

  // Step 3 State: Fiscal
  const [taxRegime, setTaxRegime] = useState('REGIMEN_GENERAL');
  const [ncfSeries, setNcfSeries] = useState('B01');

  // Step 4 State: AI Key BYOK
  const [aiProviderType, setAiProviderType] = useState<'CODEMORF' | 'GEMINI' | 'GROQ' | 'OPENAI'>('CODEMORF');
  const [aiTokenMode, setAiTokenMode] = useState<'MANAGED' | 'BYOK'>('MANAGED');
  const [aiApiKey, setAiApiKey] = useState('');

  // Step 5 State: Team Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ACCOUNTANT');

  // Step 6 State: ERP Connection
  const [erpEndpoint, setErpEndpoint] = useState('https://api.allsender.com/v1/accounting/invoices');
  const [erpApiKey, setErpApiKey] = useState('');

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    } else {
      showToast('success', 'Onboarding Completado', 'Tu organización está completamente lista para operar.');
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Step Indicator Header */}
        <div className="space-y-3 border-b border-slate-800 pb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Onboarding Inicial — Paso {currentStep} de 7
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {Math.round((currentStep / 7) * 100)}% Completado
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300" 
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Company Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-900/40 text-blue-400 rounded-2xl border border-blue-800/60">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 1: Información de Empresa Principal</h2>
                <p className="text-xs text-slate-400">Verifica la razón social y domicilio emisor para comprobantes DGII.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Razón Social</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">RNC / Cédula</label>
                  <input
                    type="text"
                    value={rnc}
                    onChange={(e) => setRnc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Dirección Fiscal</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Branch Info */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-2xl border border-emerald-800/60">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 2: Sucursal o Sede Operativa</h2>
                <p className="text-xs text-slate-400">Configura la sede central donde se registran las erogaciones de campo.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de Sucursal</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Código de Sede</label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Fiscal Settings */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-900/40 text-amber-400 rounded-2xl border border-amber-800/60">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 3: Configuración Fiscal DGII</h2>
                <p className="text-xs text-slate-400">Define el régimen de tributación e impuesto de ITBIS para el reporte 606.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Régimen Tributario</label>
                <select
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="REGIMEN_GENERAL">Régimen General (ITBIS 18%)</option>
                  <option value="RST_PERSONAS_FISICAS">RST Personas Físicas</option>
                  <option value="RST_COMPRAS">RST Compras</option>
                  <option value="ZONA_FRANCA">Zona Franca (Exento)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">NCF Predeterminado</label>
                <select
                  value={ncfSeries}
                  onChange={(e) => setNcfSeries(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="B01">B01 — Factura de Crédito Fiscal</option>
                  <option value="B02">B02 — Consumidor Final</option>
                  <option value="E31">E31 — e-NCF Crédito Fiscal</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: AI Engine Setup */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-900/40 text-purple-400 rounded-2xl border border-purple-800/60">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 4: Motor de Inteligencia Artificial (Opcional)</h2>
                <p className="text-xs text-slate-400">Selecciona si deseas usar los tokens administrados e incluidos en tu plan o tu propia clave API (BYOK).</p>
              </div>
            </div>

            {/* Token Mode Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAiTokenMode('MANAGED');
                  setAiProviderType('CODEMORF');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  aiTokenMode === 'MANAGED'
                    ? 'bg-purple-950/60 border-purple-500/80 ring-2 ring-purple-500/30'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Tokens Incluidos en el Plan</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/60">Recomendado</span>
                </div>
                <p className="text-[11px] text-slate-400">Usa el motor administrado CodeMorf Cloud AI sin necesidad de ingresar ninguna API Key.</p>
              </button>

              <button
                type="button"
                onClick={() => setAiTokenMode('BYOK')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  aiTokenMode === 'BYOK'
                    ? 'bg-purple-950/60 border-purple-500/80 ring-2 ring-purple-500/30'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Bring Your Own Key (BYOK)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Clave Propia</span>
                </div>
                <p className="text-[11px] text-slate-400">Conecta tus propias claves privadas de Google Gemini, Groq u OpenAI.</p>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Motor de IA Preferido</label>
                <select
                  value={aiProviderType}
                  onChange={(e: any) => setAiProviderType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="CODEMORF">CodeMorf Cloud AI (Incluido en el Plan SaaS — Recomendado)</option>
                  <option value="GEMINI">Google Gemini Vision (BYOK)</option>
                  <option value="GROQ">Groq Llama 3.3 (Ultra-Low Latency)</option>
                  <option value="OPENAI">OpenAI GPT-4o (Alta Precisión)</option>
                </select>
              </div>

              {aiTokenMode === 'BYOK' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">API Key Cifrada (BYOK)</label>
                    <span className="text-[10px] text-blue-400 font-bold">Opcional</span>
                  </div>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Opcional: Introducir API Key propia..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">La clave se almacenará encriptada con cifrado AES-256-GCM en la base de datos de tu organización.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Invite Team (Optional) */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-900/40 text-cyan-400 rounded-2xl border border-cyan-800/60">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 5: Invitar Colaboradores (Opcional)</h2>
                <p className="text-xs text-slate-400">Suma a tu oficial contable o supervisores a la organización.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="contabilidad@empresa.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rol Asignado</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="ACCOUNTANT">Contable (Fiscal DGII)</option>
                  <option value="SUPERVISOR">Supervisor (Aprobaciones)</option>
                  <option value="EMPLOYEE">Empleado (Registro)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: ERP Integration (Optional) */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-900/40 text-indigo-400 rounded-2xl border border-indigo-800/60">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Paso 6: Integración ERP AllSender (Opcional)</h2>
                <p className="text-xs text-slate-400">Conecta ErogaAI con tu sistema contable externo.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">API Endpoint ERP</label>
                <input
                  type="text"
                  value={erpEndpoint}
                  onChange={(e) => setErpEndpoint(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">API Key ERP</label>
                <input
                  type="password"
                  value={erpApiKey}
                  onChange={(e) => setErpApiKey(e.target.value)}
                  placeholder="as_live_••••••••"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: First Receipt Scan */}
        {currentStep === 7 && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex p-4 bg-emerald-900/40 text-emerald-400 rounded-3xl border border-emerald-800/60 mb-2">
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-white">¡Todo Listo para Escanear tu Primer Comprobante!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tu organización está completamente configurada y segura. Puedes tomar una foto a una factura o recibo fiscal ahora mismo.
            </p>

            <button
              onClick={() => {
                onComplete();
                openScanner();
              }}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>📸 Escanear Primer Comprobante Ahora</span>
            </button>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-5">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Atrás
            </button>
          )}

          {currentStep < 7 ? (
            <button
              onClick={nextStep}
              className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentStep === 5 || currentStep === 6 ? 'Omitir / Siguiente' : 'Siguiente Paso'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              Entrar al Dashboard
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
