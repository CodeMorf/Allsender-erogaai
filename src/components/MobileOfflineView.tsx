import React, { useState } from 'react';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Bell, 
  Vibrate, 
  HardDrive, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  ArrowRight,
  Terminal,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { nativeDevice, QueuedOfflineScan } from '../lib/capacitor.ts';

export const MobileOfflineView: React.FC = () => {
  const [offlineQueue, setOfflineQueue] = useState<QueuedOfflineScan[]>(nativeDevice.getOfflineQueue());
  const [vibrateFeedback, setVibrateFeedback] = useState<string | null>(null);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  const testVibration = () => {
    nativeDevice.vibrate([100, 50, 100, 50, 100]);
    setVibrateFeedback('Vibración háptica ejecutada (navigator.vibrate).');
    setTimeout(() => setVibrateFeedback(null), 3000);
  };

  const testNotification = async () => {
    const granted = await nativeDevice.requestNotificationPermission();
    if (granted) {
      nativeDevice.showNotification('ErogaAI Fiscal', {
        body: 'Ticket de Hipermercados La Sirena aprobado por contabilidad.'
      });
      setNotifFeedback('Notificación enviada con éxito.');
    } else {
      setNotifFeedback('Permiso de notificaciones denegado o no soportado en este entorno.');
    }
    setTimeout(() => setNotifFeedback(null), 3000);
  };

  const addSimulatedOfflineTicket = () => {
    const newScan: QueuedOfflineScan = {
      id: `off_${Date.now()}`,
      timestamp: new Date().toISOString(),
      filename: `ticket_offline_${Date.now().toString().slice(-4)}.jpg`,
      image_base64: 'https://images.unsplash.com/photo-1554415707-9e49017aed81?w=800&auto=format&fit=crop&q=80',
      status: 'PENDING_UPLOAD'
    };

    nativeDevice.saveOfflineScan(newScan);
    setOfflineQueue(nativeDevice.getOfflineQueue());
  };

  const syncQueue = () => {
    setIsSyncingOffline(true);
    setTimeout(() => {
      nativeDevice.clearSyncedScans();
      setOfflineQueue([]);
      setIsSyncingOffline(false);
      nativeDevice.vibrate(100);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Capacitor Native Readiness & Modo Offline
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Arquitectura compatible con Capacitor para despliegue en iOS y Android con persistencia offline de capturas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Capacitor 6.x Listo</span>
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Device APIs Interactive Playground (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Simulador de APIs Nativas del Dispositivo
            </h2>

            <div className="space-y-3">
              {/* Vibration Test */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-blue-600" />
                    Motor Háptico (Haptics)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Feedback táctil al capturar tickets y validar NCF.
                  </div>
                </div>
                <button
                  onClick={testVibration}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                >
                  Probar Vibración
                </button>
              </div>

              {vibrateFeedback && (
                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-1">
                  {vibrateFeedback}
                </div>
              )}

              {/* Push Notifications Test */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-600" />
                    Notificaciones Push
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alertas cuando un comprobante es aprobado o rechazado.
                  </div>
                </div>
                <button
                  onClick={testNotification}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors"
                >
                  Probar Notificación
                </button>
              </div>

              {notifFeedback && (
                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 px-1">
                  {notifFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Build Terminal Commands for Capacitor */}
          <div className="all-card rounded-2xl p-5 bg-slate-950 text-slate-200 border border-slate-800 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 font-bold text-[11px] uppercase tracking-wider pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Comandos de Conversión Nativa
              </span>
              <span>iOS / Android</span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="text-slate-400"># 1. Compilar bundle web optimizado</div>
              <div className="text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">npm run build</div>
              
              <div className="text-slate-400"># 2. Sincronizar activos con Capacitor</div>
              <div className="text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">npx cap sync</div>

              <div className="text-slate-400"># 3. Abrir proyecto en Android Studio / Xcode</div>
              <div className="text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">npx cap open android</div>
            </div>
          </div>
        </div>

        {/* Right Column: Offline Storage Queue Inspector (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  Cola de Capturas Offline ({offlineQueue.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fotos guardadas localmente en el dispositivo cuando no hay cobertura 4G/WiFi.
                </p>
              </div>

              <button
                onClick={addSimulatedOfflineTicket}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                + Simular Captura
              </button>
            </div>

            {offlineQueue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                  No hay capturas pendientes en la cola local.
                </div>
                <p className="text-[11px] text-slate-400">
                  Todos los tickets han sido transmitidos y procesados por la IA.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {offlineQueue.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img src={q.image_base64} alt="Ticket" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{q.filename}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{new Date(q.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Pendiente de Subida
                    </span>
                  </div>
                ))}

                <button
                  onClick={syncQueue}
                  disabled={isSyncingOffline}
                  className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSyncingOffline ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  <span>Procesar Cola con IA Ahora</span>
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
