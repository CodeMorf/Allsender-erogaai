import React from 'react';
import { usePWA } from '../context/PWAContext';
import { ErogaLogo } from './Logo.js';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X, Sparkles, ShieldCheck } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    promptInstall, 
    showInstallModal, 
    setShowInstallModal 
  } = usePWA();

  const [dismissed, setDismissed] = React.useState(false);

  // If installed or user explicitly dismissed the floating bottom banner (modal can still open via button)
  if (isInstalled) return null;

  return (
    <>
      {/* Floating Mini Banner for Quick Install on Mobile/Desktop */}
      {!dismissed && (isInstallable || isIOS) && !showInstallModal && (
        <div 
          id="pwa-install-floating-banner"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-slate-900/95 backdrop-blur-md border border-blue-500/30 shadow-2xl rounded-2xl p-4 text-white animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-950/90 border border-slate-700/80 flex items-center justify-center p-1 shrink-0 shadow-lg shadow-slate-950/40">
              <ErogaLogo size={36} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-100">Instalar ErogaAI</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono uppercase tracking-wider">PWA</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                Acceso rápido desde tu pantalla de inicio, escaneo con cámara y modo sin internet.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  id="btn-pwa-install-now"
                  onClick={() => {
                    if (isIOS) {
                      setShowInstallModal(true);
                    } else {
                      promptInstall();
                    }
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar App
                </button>
                <button
                  id="btn-pwa-dismiss-banner"
                  onClick={() => setDismissed(true)}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-md"
              aria-label="Cerrar banner de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Installation Instructions Modal */}
      {showInstallModal && (
        <div 
          id="pwa-install-guide-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowInstallModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center p-1 shadow-lg shadow-slate-950/40">
                  <ErogaLogo size={42} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <span>Instalar</span>
                    <span>Eroga<span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white font-extrabold">AI</span></span>
                  </h3>
                  <p className="text-xs text-slate-400">Sin descargas pesadas de tienda de apps</p>
                </div>
              </div>
              <button
                id="btn-close-pwa-modal"
                onClick={() => setShowInstallModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Benefits List */}
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Acceso directo instantáneo en pantalla de inicio</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Captura rápida con cámara integrada para recibos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Funciona incluso en zonas con mala o sin señal (Offline)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sin ocupar espacio extra de almacenamiento</span>
              </div>
            </div>

            {/* Device-Specific Instructions */}
            {isIOS ? (
              <div className="space-y-3 bg-blue-950/40 border border-blue-900/40 rounded-xl p-4 text-xs">
                <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Instrucciones para iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2.5 text-slate-300 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-400">1.</span>
                    <span>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> en la barra inferior de Safari.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-400">2.</span>
                    <span>Desliza hacia abajo y pulsa <strong>"Añadir a pantalla de inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-blue-400" />.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-400">3.</span>
                    <span>Presiona <strong>"Añadir"</strong> en la esquina superior derecha y ¡listo!</span>
                  </li>
                </ol>
              </div>
            ) : isInstallable ? (
              <div className="space-y-3">
                <button
                  id="btn-pwa-modal-install-direct"
                  onClick={async () => {
                    await promptInstall();
                    setShowInstallModal(false);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  Instalar Ahora con 1 Click
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Compatible con Chrome, Edge, Brave, Samsung Internet y Firefox.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-300 bg-slate-800/40 p-4 rounded-xl">
                <p className="font-semibold text-slate-200">En Computadoras (Chrome / Edge):</p>
                <p>Haz clic en el icono de instalación <Download className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> en el extremo derecho de la barra de direcciones de tu navegador.</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
