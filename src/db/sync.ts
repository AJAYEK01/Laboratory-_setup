import { db, type SyncLogEntry } from './index';
import { getSupabaseClient } from '../lib/supabase';
import type { SyncStats, Patient, TestOrder } from '../types/lab';

function mapPatientForSupabase(p: Patient) {
  return {
    id: p.id,
    branch_id: p.branchId,
    branch_code: p.branchCode,
    name: p.name,
    age: p.age,
    age_unit: p.ageUnit,
    gender: p.gender,
    phone: p.phone || null,
    address: p.address || null,
    referral_doctor: p.referralDoctor || null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    sync_status: 'synced',
  };
}

function mapOrderForSupabase(o: TestOrder) {
  return {
    id: o.id,
    branch_id: o.branchId,
    branch_code: o.branchCode,
    patient_id: o.patientId,
    patient_name: o.patientName,
    patient_age: o.patientAge,
    patient_age_unit: o.patientAgeUnit,
    patient_gender: o.patientGender,
    patient_phone: o.patientPhone || null,
    referral_doctor: o.referralDoctor || null,
    order_date: o.orderDate,
    order_time: o.orderTime,
    tests: o.tests,
    total_amount: o.totalAmount,
    discount_amount: o.discountAmount,
    final_amount: o.finalAmount,
    paid_amount: o.paidAmount,
    balance_amount: o.balanceAmount,
    payment_status: o.paymentStatus,
    payment_mode: o.paymentMode,
    overall_status: o.overallStatus,
    notes: o.notes || null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    sync_status: 'synced',
  };
}

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
    const totalPending = pendingPatients + pendingOrders;

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

      // 1. Sync with Central Express Backend API (if running locally or hosted)
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
        // Express backend is optional when syncing directly with Supabase
      }

      // 2. Direct Sync with Supabase Cloud
      let supabaseSuccess = false;
      const client = getSupabaseClient(settings?.cloudSyncUrl, settings?.cloudSyncKey);
      if (client && (pendingPatients.length > 0 || pendingOrders.length > 0)) {
        // Guarantee foreign key integrity: gather all referenced patient IDs
        const orderPatientIds = Array.from(new Set(pendingOrders.map(o => o.patientId)));
        const pendingPatientIdSet = new Set(pendingPatients.map(p => p.id));
        const missingPatientIds = orderPatientIds.filter(id => !pendingPatientIdSet.has(id));

        let extraPatients: Patient[] = [];
        if (missingPatientIds.length > 0) {
          extraPatients = await db.patients.where('id').anyOf(missingPatientIds).toArray();
        }

        const allPatientsToSync = [...pendingPatients, ...extraPatients];

        // Step 1: Upsert patients first
        if (allPatientsToSync.length > 0) {
          const mappedPatients = allPatientsToSync.map(mapPatientForSupabase);
          const { error: patientErr } = await client.from('patients').upsert(mappedPatients, { onConflict: 'id' });
          if (patientErr) {
            console.error('Supabase patient upsert error:', patientErr);
            throw new Error(`Patient sync error: ${patientErr.message}`);
          }
        }

        // Step 2: Upsert orders second (foreign key to patients is now guaranteed)
        if (pendingOrders.length > 0) {
          const mappedOrders = pendingOrders.map(mapOrderForSupabase);
          const { error: orderErr } = await client.from('orders').upsert(mappedOrders, { onConflict: 'id' });
          if (orderErr) {
            console.error('Supabase order upsert error:', orderErr);
            throw new Error(`Order sync error: ${orderErr.message}`);
          }
        }

        supabaseSuccess = true;
      }

      // Mark records as synced locally only if confirmed by cloud
      if (supabaseSuccess || serverSyncSuccess) {
        if (pendingPatients.length > 0) {
          await db.patients.bulkPut(pendingPatients.map(p => ({ ...p, syncStatus: 'synced' as const })));
        }
        if (pendingOrders.length > 0) {
          await db.orders.bulkPut(pendingOrders.map(o => ({ ...o, syncStatus: 'synced' as const })));
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
      await this.notifyListeners(null, serverSyncSuccess || supabaseSuccess);

      const destination = supabaseSuccess && serverSyncSuccess
        ? 'Central Server & Supabase Cloud'
        : supabaseSuccess
        ? 'Supabase Cloud'
        : serverSyncSuccess
        ? 'Central Server'
        : 'Local Branch Storage';

      return {
        success: true,
        message: (supabaseSuccess || serverSyncSuccess)
          ? `Synced ${totalToSync} records with ${destination} successfully.`
          : 'Records safely preserved locally in branch database.',
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