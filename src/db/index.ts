import Dexie, { type Table } from 'dexie';
import type { Patient, TestTemplate, TestOrder, LabSettings } from '../types/lab';
import { defaultSettings, defaultTests } from './defaultData';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'upload' | 'download' | 'error';
  recordsCount: number;
  message: string;
}

export class LabDatabase extends Dexie {
  patients!: Table<Patient, string>;
  testTemplates!: Table<TestTemplate, string>;
  orders!: Table<TestOrder, string>;
  settings!: Table<LabSettings, string>;
  syncLogs!: Table<SyncLogEntry, string>;

  constructor() {
    super('VillageLabPulseDB');

    // Version 1 Schema
    this.version(1).stores({
      patients: 'id, name, phone, referralDoctor, createdAt, updatedAt, syncStatus',
      testTemplates: 'id, code, name, category, isActive, updatedAt, syncStatus',
      orders: 'id, patientId, patientName, patientPhone, orderDate, overallStatus, paymentStatus, createdAt, updatedAt, syncStatus',
      settings: 'id',
      syncLogs: 'id, timestamp, type',
    });
  }
}

export const db = new LabDatabase();

/**
 * Ensures the browser marks this IndexedDB as Persistent so that
 * the browser or operating system NEVER clears the data during cleanups or overnight.
 */
export async function ensurePersistentStorage(): Promise<{ isPersisted: boolean; quotaMb?: number; usageMb?: number }> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    let quotaMb: number | undefined;
    let usageMb: number | undefined;

    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) quotaMb = Math.round(estimate.quota / (1024 * 1024));
      if (estimate.usage) usageMb = Math.round(estimate.usage / (1024 * 1024));
    }

    return { isPersisted, quotaMb, usageMb };
  }
  return { isPersisted: false };
}

/**
 * Pre-populates the local database with standard village diagnostic tests and default settings
 */
export async function initializeDatabase(): Promise<void> {
  // Ensure persistent storage
  await ensurePersistentStorage();

  // Check and seed settings
  const existingSettings = await db.settings.get('lab_profile');
  if (!existingSettings) {
    await db.settings.put(defaultSettings);
  } else {
    // If settings still has legacy name or missing sync keys, upgrade to DIVINE LABORATORY
    await db.settings.update('lab_profile', {
      labName: 'DIVINE LABORATORY',
      tagline: defaultSettings.tagline,
      address: defaultSettings.address,
      phone: defaultSettings.phone,
      regNo: defaultSettings.regNo,
      pathologistName: defaultSettings.pathologistName,
      pathologistDegree: defaultSettings.pathologistDegree,
      technicianName: defaultSettings.technicianName,
      currentBranchName: existingSettings.currentBranchCode === 'BR02' 
        ? 'Divine Laboratory - Chandanakkampara, Payyavoor' 
        : 'Divine Laboratory - Koottummugham, Sreekandapuram',
      cloudSyncUrl: existingSettings.cloudSyncUrl || defaultSettings.cloudSyncUrl,
      cloudSyncKey: existingSettings.cloudSyncKey || defaultSettings.cloudSyncKey,
    });
  }

  // Check and seed tests catalog
  const testCount = await db.testTemplates.count();
  if (testCount === 0) {
    await db.testTemplates.bulkPut(defaultTests);
  } else {
    // Ensure any previously seeded tests with pending status are updated to synced
    await db.testTemplates.where('syncStatus').equals('pending').modify({ syncStatus: 'synced' });
  }
}

/**
 * Export all local data to a single JSON file for offline backup (can be saved to pen drive)
 */
export async function exportLocalBackup(): Promise<string> {
  const patients = await db.patients.toArray();
  const testTemplates = await db.testTemplates.toArray();
  const orders = await db.orders.toArray();
  const settings = await db.settings.toArray();

  const backupData = {
    version: 1,
    exportDate: new Date().toISOString(),
    labName: settings[0]?.labName || 'Village Lab',
    data: {
      patients,
      testTemplates,
      orders,
      settings,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Restore local data from an offline JSON backup file
 */
export async function restoreLocalBackup(jsonString: string): Promise<{ patients: number; orders: number; tests: number }> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.data) {
    throw new Error('Invalid backup file format.');
  }

  const { patients = [], testTemplates = [], orders = [], settings = [] } = parsed.data;

  await db.transaction('rw', [db.patients, db.testTemplates, db.orders, db.settings], async () => {
    if (patients.length > 0) await db.patients.bulkPut(patients);
    if (testTemplates.length > 0) await db.testTemplates.bulkPut(testTemplates);
    if (orders.length > 0) await db.orders.bulkPut(orders);
    if (settings.length > 0) await db.settings.bulkPut(settings);
  });

  return {
    patients: patients.length,
    orders: orders.length,
    tests: testTemplates.length,
  };
}
