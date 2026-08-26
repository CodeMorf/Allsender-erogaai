import React from 'react';
import { usePWA } from '../context/PWAContext';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PWAUpdateToast: React.FC = () => {
  const { updateAvailable, updateServiceWorker } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div 
      id="pwa-update-toast"
      className="fixed top-4 right-4 z-50 bg-blue-900/95 border border-blue-400/40 text-white rounded-xl p-4 shadow-2xl backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-top-3 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-blue-300" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-white">Actualización de ErogaAI disponible</h4>
          <p className="text-[11px] text-blue-200 mt-0.5">
            Hay mejoras y optimizaciones listas para instalar.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={updateServiceWorker}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar Ahora
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-2 py-1 text-xs text-blue-200 hover:text-white transition-colors"
            >
              Más tarde
            </button>
          </div>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="text-blue-300 hover:text-white p-1"
          aria-label="Cerrar aviso de actualización"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
