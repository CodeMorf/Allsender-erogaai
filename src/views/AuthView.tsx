import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Mail, Building, Phone, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { showToast, fetchSession, fetchCompanies } = useApp();
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

  const fieldClassName = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700';
  const labelClassName = 'block text-xs font-bold text-slate-700 mb-1';
  const smallLabelClassName = 'block text-[11px] font-bold text-slate-700 mb-1';
  const primaryButtonClassName = 'w-full py-2.5 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer';
  const footerClassName = 'text-center pt-3 border-t border-slate-200 text-xs text-slate-500';
  const linkClassName = 'text-emerald-800 font-bold hover:text-emerald-950 hover:underline cursor-pointer';

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
      await fetchSession();
      await fetchCompanies();
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
      await fetchSession();
      await fetchCompanies();
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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-[#f6f8f5] px-4 py-8 font-sans text-slate-900 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff8e8_0%,#fffdf8_48%,#edf7f1_100%)]" />
        <div className="absolute -left-28 -top-32 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-950/10 blur-3xl" />
        <div className="absolute bottom-[-13rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <section className="hidden max-w-xl space-y-7 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-950 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            AllSender · Gestión fiscal
          </div>
          <div className="space-y-4">
            <h2 className="max-w-lg text-4xl font-black leading-tight tracking-tight text-emerald-950 xl:text-5xl">
              Controla tus erogaciones con claridad.
            </h2>
            <p className="max-w-lg text-base leading-7 text-slate-600">
              Registra comprobantes, valida información DGII y mantén tus gastos organizados desde una experiencia simple y conectada.
            </p>
          </div>
          <div className="grid max-w-lg grid-cols-3 gap-3">
            {[
              ['DGII 606', 'Reportes listos'],
              ['OCR + IA', 'Menos digitación'],
              ['Multiempresa', 'Datos aislados']
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur">
                <p className="text-xs font-black text-emerald-950">{title}</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

      <div className="w-full max-w-md rounded-[2rem] border border-white/90 bg-white/95 p-6 shadow-[0_24px_80px_rgba(2,44,34,0.14)] backdrop-blur-xl sm:p-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-700 text-white shadow-lg shadow-emerald-950/20 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">ErogaAI SaaS</h1>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Plataforma Inteligente de Gestión Fiscal DGII'}
            {mode === 'register' && 'Crea tu Organización y Registro Empresarial'}
            {mode === 'forgot' && 'Recuperación de Contraseña'}
          </p>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelClassName}>Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className={`${fieldClassName} pl-9 pr-3`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClassName}>Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-emerald-800 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldClassName} pl-9 pr-3`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={primaryButtonClassName}
            >
              <span>{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className={footerClassName}>
              ¿No tienes una cuenta aún?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className={linkClassName}
              >
                Registrar Organización
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={smallLabelClassName}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className={smallLabelClassName}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={smallLabelClassName}>Razón Social Empresa</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Comercial AllSender SRL"
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className={smallLabelClassName}>RNC o Cédula (DGII)</label>
                <input
                  type="text"
                  required
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  placeholder="131-89241-2"
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={smallLabelClassName}>Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (809) 555-0199"
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className={smallLabelClassName}>País</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className={smallLabelClassName}>Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className={smallLabelClassName}>Confirmar Contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-600">
                Acepto los términos de servicio y políticas de privacidad DGII.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`${primaryButtonClassName} mt-2`}
            >
              <span>{isLoading ? 'Creando organización...' : 'Crear Cuenta y Organización'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className={footerClassName}>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className={linkClassName}
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
              <label className={labelClassName}>Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className={fieldClassName}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={primaryButtonClassName}
            >
              <span>{isLoading ? 'Enviando...' : 'Enviar Instrucciones'}</span>
            </button>

            <div className={footerClassName}>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={linkClassName}
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

      </div>
      </div>
    </div>
  );
};
