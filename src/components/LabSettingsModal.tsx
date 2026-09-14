import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  ShieldCheck, 
  Cloud, 
  Building, 
  UserCheck, 
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { db, exportLocalBackup, restoreLocalBackup, ensurePersistentStorage } from '../db/index';
import { syncManager } from '../db/sync';
import type { LabSettings } from '../types/lab';

export const LabSettingsModal: React.FC = () => {
  const currentSettings = useLiveQuery(() => db.settings.get('lab_profile'), []);
  const [formData, setFormData] = useState<LabSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ isPersisted: boolean; quotaMb?: number; usageMb?: number }>({
    isPersisted: true,
  });

  useEffect(() => {
    if (currentSettings) {
      setFormData(JSON.parse(JSON.stringify(currentSettings)));
    }
    ensurePersistentStorage().then(setStorageInfo);
  }, [currentSettings]);

  if (!formData) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading settings...</div>;
  }

  const handleSaveSettings = async () => {
    try {
      await db.settings.put(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings to local database.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportLocalBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `village_lab_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export local backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await restoreLocalBackup(text);
        alert(`Backup restored successfully! Restored ${res.patients} patients, ${res.orders} orders, and ${res.tests} tests.`);
        window.location.reload();
      } catch (err) {
        console.error('Restore error:', err);
        alert('Invalid backup file format or restoration failed.');
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await syncManager.syncNow();
    setIsSyncing(false);
    setSyncFeedback(result.message);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            Laboratory Configuration &amp; Local Data Safety
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Customize lab report header, doctor credentials, cloud sync &amp; offline backup
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? 'Settings Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Local Storage & Data Retention Guarantee Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-950">
                Permanent Local Data Retention Guaranteed
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Your lab data is configured as <strong>Persistent Local Storage</strong>. It will never be cleared automatically by the browser, even overnight or during system cleanups. You can look up any patient from weeks or months ago anytime without internet.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-emerald-900">
                <span>Persistence: <strong>{storageInfo.isPersisted ? 'Active (Protected)' : 'Standard'}</strong></span>
                {storageInfo.quotaMb && (
                  <span>Available Disk Space: <strong>~{storageInfo.quotaMb} MB</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Offline Backup & USB Export Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-teal-600" />
            Offline Backup &amp; Pen Drive Export
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Download a single backup file containing all patients, test orders, and pricing. You can copy it to a USB pen drive for extra peace of mind.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Download Lab Backup (.json)</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-all border border-slate-300">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Restore Backup from File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Lab Profile & Report Letterhead Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600" />
            Lab Letterhead &amp; Diagnostic Center Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Laboratory / Clinic Name</label>
              <input
                type="text"
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tagline / Sub-heading</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Center Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone(s)</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Govt Registration / License No</label>
              <input
                type="text"
                value={formData.regNo}
                onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Doctor & Signatory Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-600" />
            Report Signatories (Doctor &amp; Technologist)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Consultant Pathologist Name</label>
              <input
                type="text"
                value={formData.pathologistName}
                onChange={(e) => setFormData({ ...formData, pathologistName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Degrees &amp; Registration (MCI)</label>
              <input
                type="text"
                value={formData.pathologistDegree}
                onChange={(e) => setFormData({ ...formData, pathologistDegree: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Senior Lab Technologist Name</label>
              <input
                type="text"
                value={formData.technicianName}
                onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Cloud Database (Supabase) Sync Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-teal-600" />
            Owner Remote Cloud Synchronization (Supabase)
          </h3>
          <p className="text-xs text-slate-500">
            Configure your free Supabase project to allow the lab owner to monitor patient visits and daily revenue from any mobile phone or outside laptop.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={formData.cloudSyncUrl || ''}
                onChange={(e) => setFormData({ ...formData, cloudSyncUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supabase Anon Public API Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={formData.cloudSyncKey || ''}
                onChange={(e) => setFormData({ ...formData, cloudSyncKey: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Now...' : 'Test Sync to Cloud Now'}</span>
            </button>

            {syncFeedback && (
              <span className="text-xs text-slate-600 font-medium">
                {syncFeedback}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
