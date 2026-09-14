import { db, type SyncLogEntry } from './index';
import { getSupabaseClient } from '../lib/supabase';
import type { SyncStats } from '../types/lab';

class SyncManager {
  private isSyncing = false;
  private listeners: ((stats: SyncStats) => void)[] = [];
  public syncTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners();
        this.syncNow();
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });

      this.syncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncNow();
        }
      }, 30000);
    }
  }

  public subscribe(callback: (stats: SyncStats) => void): () => void {
    this.listeners.push(callback);
    this.getStats().then(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private async notifyListeners(errorMessage?: string | null, serverConnected?: boolean) {
    const stats = await this.getStats(errorMessage, serverConnected);
    this.listeners.forEach(cb => cb(stats));
  }

  public async getStats(errorMessage?: string | null, serverConnected?: boolean): Promise<SyncStats> {
    const pendingPatients = await db.patients.where('syncStatus').equals('pending').count();
    const pendingOrders = await db.orders.where('syncStatus').equals('pending').count();
    const pendingTests = await db.testTemplates.where('syncStatus').equals('pending').count();
    const totalPending = pendingPatients + pendingOrders + pendingTests;

    const syncedPatients = await db.patients.where('syncStatus').equals('synced').count();
    const syncedOrders = await db.orders.where('syncStatus').equals('synced').count();
    const totalSynced = syncedPatients + syncedOrders;

    const settings = await db.settings.get('lab_profile');

    return {
      pendingCount: totalPending,
      syncedCount: totalSynced,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: this.isSyncing,
      lastSyncTime: settings?.lastSyncedAt || null,
      errorMessage,
      centralServerConnected: serverConnected,
    };
  }

  public async syncNow(): Promise<{ success: boolean; message: string; count: number }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress', count: 0 };
    }

    if (!navigator.onLine) {
      await this.notifyListeners('No internet connection. Data is safely stored locally in branch database.');
      return { success: false, message: 'No internet connection', count: 0 };
    }

    this.isSyncing = true;
    await this.notifyListeners();

    try {
      const settings = await db.settings.get('lab_profile');
      const pendingPatients = await db.patients.where('syncStatus').equals('pending').toArray();
      const pendingOrders = await db.orders.where('syncStatus').equals('pending').toArray();
      const totalToSync = pendingPatients.length + pendingOrders.length;

      const centralUrl = settings?.centralServerUrl || 'http://localhost:5000';
      let serverSyncSuccess = false;

      // 1. Sync with Central Express Backend API
      try {
        const token = localStorage.getItem('lab_auth_token');
        const res = await fetch(`${centralUrl}/api/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            branchId: settings?.currentBranchId || 'branch-01',
            branchCode: settings?.currentBranchCode || 'BR01',
            patients: pendingPatients,
            orders: pendingOrders,
          }),
        });

        if (res.ok) {
          serverSyncSuccess = true;
        }
      } catch (centralErr) {
        console.log('Central server not reachable currently, proceeding with local cache:', centralErr);
      }

      // 2. Also Sync with Supabase if configured
      const client = getSupabaseClient(settings?.cloudSyncUrl, settings?.cloudSyncKey);
      if (client && (pendingPatients.length > 0 || pendingOrders.length > 0)) {
        if (pendingPatients.length > 0) {
          await client.from('patients').upsert(pendingPatients.map(p => ({ ...p, syncStatus: 'synced' })), { onConflict: 'id' });
        }
        if (pendingOrders.length > 0) {
          await client.from('orders').upsert(pendingOrders.map(o => ({ ...o, syncStatus: 'synced' })), { onConflict: 'id' });
        }
      }

      // Mark records as synced locally
      if (serverSyncSuccess || client) {
        if (pendingPatients.length > 0) {
          await db.patients.bulkPut(pendingPatients.map(p => ({ ...p, syncStatus: 'synced' })));
        }
        if (pendingOrders.length > 0) {
          await db.orders.bulkPut(pendingOrders.map(o => ({ ...o, syncStatus: 'synced' })));
        }
      }

      const now = new Date().toISOString();
      if (settings) {
        await db.settings.update('lab_profile', { lastSyncedAt: now });
      }

      const logEntry: SyncLogEntry = {
        id: `sync-${Date.now()}`,
        timestamp: now,
        type: 'upload',
        recordsCount: totalToSync,
        message: `Synchronized ${totalToSync} records to central cloud gateway.`,
      };
      await db.syncLogs.put(logEntry);

      this.isSyncing = false;
      await this.notifyListeners(null, serverSyncSuccess);

      return {
        success: true,
        message: serverSyncSuccess
          ? `Synced ${totalToSync} records with Central Server successfully.`
          : 'Records preserved locally. Will sync when Central Server reconnects.',
        count: totalToSync,
      };
    } catch (err: any) {
      console.error('Cloud synchronization error:', err);
      this.isSyncing = false;
      const errorMsg = err?.message || 'Failed to sync with central cloud.';
      await this.notifyListeners(errorMsg, false);
      return { success: false, message: errorMsg, count: 0 };
    }
  }
}

export const syncManager = new SyncManager();