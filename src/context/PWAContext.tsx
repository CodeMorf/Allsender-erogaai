import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface OfflineDraft {
  id: string;
  createdAt: string;
  supplier_name: string;
  ncf?: string;
  total_amount: number;
  itbis_amount: number;
  category: string;
  image_base64?: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isIOS: boolean;
  offlineDrafts: OfflineDraft[];
  offlineQueueCount: number;
  promptInstall: () => Promise<boolean>;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
  saveOfflineDraft: (draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'syncStatus'>) => Promise<string>;
  deleteOfflineDraft: (id: string) => void;
  syncOfflineDrafts: () => Promise<{ synced: number; failed: number }>;
  serviceWorkerActive: boolean;
  updateAvailable: boolean;
  updateServiceWorker: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

const OFFLINE_DRAFTS_STORAGE_KEY = 'eroga_offline_drafts_v1';
const SERVICE_WORKER_VERSION = '1.1.0';

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraft[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_DRAFTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if iOS Safari
  const isIOS = typeof window !== 'undefined' && 
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !(window as any).MSStream;

  // Persist offline drafts
  const saveDraftsToStorage = (drafts: OfflineDraft[]) => {
    setOfflineDrafts(drafts);
    try {
      localStorage.setItem(OFFLINE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error('Error storing offline drafts:', e);
    }
  };

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`/sw.js?v=${SERVICE_WORKER_VERSION}`)
        .then((reg) => {
          setSwRegistration(reg);
          setServiceWorkerActive(true);
          console.log('[PWA] Service Worker registrado exitosamente:', reg.scope);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nueva versión disponible.');
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker no pudo registrarse:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Check if already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  // Listen to PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('[PWA] Evento beforeinstallprompt capturado');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallModal(false);
      console.log('[PWA] Aplicación instalada exitosamente en el dispositivo');
    };

    const handleOnline = () => {
      setIsOffline(false);
      console.log('[PWA] Conexión a internet restaurada');
      // Auto-trigger sync when back online
      syncOfflineDrafts();
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.warn('[PWA] Modo sin conexión activado');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } else {
      // Open manual install guide (especially for iOS Safari or Chrome desktop)
      setShowInstallModal(true);
      return false;
    }
  }, [deferredPrompt]);

  const updateServiceWorker = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const saveOfflineDraft = async (data: Omit<OfflineDraft, 'id' | 'createdAt' | 'syncStatus'>): Promise<string> => {
    const newDraft: OfflineDraft = {
      ...data,
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING'
    };

    const updated = [newDraft, ...offlineDrafts];
    saveDraftsToStorage(updated);
    return newDraft.id;
  };

  const deleteOfflineDraft = (id: string) => {
    const filtered = offlineDrafts.filter(d => d.id !== id);
    saveDraftsToStorage(filtered);
  };

  const syncOfflineDrafts = async (): Promise<{ synced: number; failed: number }> => {
    if (offlineDrafts.length === 0) return { synced: 0, failed: 0 };
    
    let synced = 0;
    let failed = 0;
    const remainingDrafts: OfflineDraft[] = [];

    for (const draft of offlineDrafts) {
      try {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_name: draft.supplier_name,
            ncf: draft.ncf || '',
            total_amount: draft.total_amount,
            itbis_amount: draft.itbis_amount,
            expense_category: draft.category,
            receipt_image_url: draft.image_base64,
            status: 'PENDING_REVIEW',
            approval_notes: 'Capturado en modo Offline (PWA)'
          })
        });

        if (res.ok) {
          synced++;
        } else {
          failed++;
          remainingDrafts.push({ ...draft, syncStatus: 'FAILED' });
        }
      } catch (err) {
        failed++;
        remainingDrafts.push(draft);
      }
    }

    saveDraftsToStorage(remainingDrafts);
    return { synced, failed };
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isOffline,
        isIOS,
        offlineDrafts,
        offlineQueueCount: offlineDrafts.length,
        promptInstall,
        showInstallModal,
        setShowInstallModal,
        saveOfflineDraft,
        deleteOfflineDraft,
        syncOfflineDrafts,
        serviceWorkerActive,
        updateAvailable,
        updateServiceWorker
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
