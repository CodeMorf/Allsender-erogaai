import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOffline, offlineQueueCount, syncOfflineDrafts } = usePWA();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncOfflineDrafts();
      if (result.synced > 0) {
        setSyncResult(`Sincronizados ${result.synced} comprobantes.`);
      } else if (result.failed > 0) {
        setSyncResult(`Error sincronizando ${result.failed} recibos.`);
      } else {
        setSyncResult('No hay comprobantes pendientes.');
      }
    } catch {
      setSyncResult('Error al conectar con el servidor.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  };

  // If online and no queued items, don't display banner
  if (!isOffline && offlineQueueCount === 0 && !syncResult) {
    return null;
  }

  return (
    <div 
      id="pwa-offline-status-bar"
      className={`px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center justify-between shadow-md ${
        isOffline 
          ? 'bg-amber-600/90 text-amber-50 backdrop-blur-sm' 
          : 'bg-emerald-600/90 text-emerald-50 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center gap-2 max-w-2xl">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
            <span>
              <strong>Modo Sin Conexión (Offline):</strong> Puedes seguir escaneando y registrando gastos. Se guardarán en el dispositivo y se sincronizarán al volver a tener señal.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <span>
              {syncResult || 'Conexión restaurada.'}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        {offlineQueueCount > 0 && (
          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-full text-[11px]">
            <Database className="w-3 h-3 text-amber-200" />
            <span>{offlineQueueCount} pendiente{offlineQueueCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {!isOffline && offlineQueueCount > 0 && (
          <button
            id="btn-pwa-sync-offline"
            onClick={handleManualSync}
            disabled={syncing}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg text-white font-semibold flex items-center gap-1 text-[11px] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        )}
      </div>
    </div>
  );
};
