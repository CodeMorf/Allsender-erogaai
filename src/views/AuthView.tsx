import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, Building, Phone, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rnc, setRnc] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Dominican Republic');
  const [acceptTerms, setAcceptTerms] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      showToast('success', 'Bienvenido', `Sesión iniciada como ${data.user.name}`);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (!acceptTerms) {
      setErrorMessage('Debe aceptar los términos de servicio');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          company_name: companyName,
          rnc,
          phone,
          country,
          accept_terms: acceptTerms
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error durante el registro');
      }

      showToast('success', 'Organización Creada', `Bienvenido a ErogaAI, ${data.user.name}`);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fallo en registro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      setSuccessMessage(data.message || 'Instrucciones enviadas');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ErogaAI SaaS</h1>
          <p className="text-xs text-slate-400">
            {mode === 'login' && 'Plataforma Inteligente de Gestión Fiscal DGII'}
            {mode === 'register' && 'Crea tu Organización y Registro Empresarial'}
            {mode === 'forgot' && 'Recuperación de Contraseña'}
          </p>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Registrar Organización
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Razón Social Empresa</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Comercial AllSender SRL"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">RNC o Cédula (DGII)</label>
                <input
                  type="text"
                  required
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  placeholder="131-89241-2"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (809) 555-0199"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">País</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400">
                Acepto los términos de servicio y políticas de privacidad DGII.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Creando organización...' : 'Crear Cuenta y Organización'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Enviando...' : 'Enviar Instrucciones'}</span>
            </button>

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
