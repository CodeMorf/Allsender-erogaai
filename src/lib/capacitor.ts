// Capacitor & Native Device Utilities for ErogaAI Mobile App

export interface QueuedOfflineScan {
  id: string;
  timestamp: string;
  image_base64: string;
  filename: string;
  status: 'PENDING_UPLOAD' | 'SYNCED' | 'FAILED';
}

export const nativeDevice = {
  // Check if running in Capacitor Native runtime
  isNative(): boolean {
    return typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
  },

  // Haptic feedback vibration
  vibrate(pattern: number | number[] = 50): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ignore
    }
  },

  // Native notification simulator / Web notification
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof Notification !== 'undefined') {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  },

  showNotification(title: string, options?: NotificationOptions): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  },

  // Offline Storage Queue
  getOfflineQueue(): QueuedOfflineScan[] {
    try {
      const data = localStorage.getItem('erogaai_offline_queue');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveOfflineScan(item: QueuedOfflineScan): void {
    const queue = this.getOfflineQueue();
    queue.unshift(item);
    localStorage.setItem('erogaai_offline_queue', JSON.stringify(queue.slice(0, 50)));
  },

  removeOfflineScan(id: string): void {
    const queue = this.getOfflineQueue().filter(q => q.id !== id);
    localStorage.setItem('erogaai_offline_queue', JSON.stringify(queue));
  },

  clearSyncedScans(): void {
    const queue = this.getOfflineQueue().filter(q => q.status === 'PENDING_UPLOAD');
    localStorage.setItem('erogaai_offline_queue', JSON.stringify(queue));
  }
};
