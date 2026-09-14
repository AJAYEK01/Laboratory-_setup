import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  UserPlus, 
  Clock, 
  Settings, 
  BarChart3, 
  FlaskConical,
  ShieldCheck,
  Building2,
  LogIn,
  LogOut
} from 'lucide-react';
import type { SyncStats, LabSettings } from '../types/lab';
import { syncManager } from '../db/sync';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  settings: LabSettings | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, settings }) => {
  const { user, currentBranch, availableBranches, switchBranch, logout, setIsLoginModalOpen } = useAuth();

  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    syncedCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((stats) => {
      setSyncStats(stats);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    await syncManager.syncNow();
  };

  const isOwner = user?.role === 'owner';

  const navItems = isOwner ? [
    { id: 'dashboard', label: 'Executive Overview', icon: BarChart3 },
    { id: 'records', label: 'All Records', icon: Clock },
    { id: 'catalog', label: 'Test Catalog', icon: FlaskConical },
    { id: 'settings', label: 'Lab Settings', icon: Settings },
  ] : [
    { id: 'booking', label: 'New Patient', icon: UserPlus },
    { id: 'results', label: 'Enter Results', icon: Activity },
    { id: 'records', label: 'Records & History', icon: Clock },
    { id: 'catalog', label: 'Test Catalog', icon: FlaskConical },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Tier */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Lab Info */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab(isOwner ? 'dashboard' : 'booking')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-white tracking-wide flex items-center gap-2 font-sans">
                {settings?.labName || 'DIVINE LABORATORY'}
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-teal-400 font-bold tracking-wider uppercase">
                  {isOwner ? 'Executive Portal (Central HQ)' : `[${currentBranch.code}] ${currentBranch.name.replace('Divine Laboratory - ', '')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Active Branch Display: Switcher for Owner only, locked badge for Tech */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
            <Building2 className="w-4 h-4 text-teal-400" />
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Branch:</span>
                <select
                  value={currentBranch.id}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs font-bold text-teal-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {availableBranches.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-800 text-white">
                      [{b.code}] {b.name.replace('Divine Laboratory - ', '')}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs font-bold text-teal-300">
                <span className="text-slate-400 font-normal mr-1">Counter:</span>
                [{currentBranch.code}] {currentBranch.name.replace('Divine Laboratory - ', '')}
              </div>
            )}
          </div>

          {/* Sync & Connectivity Status Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Storage Persistence Shield */}
            <div 
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
              title="Data is stored securely on this computer's local disk and will never be cleared overnight."
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Permanent Storage</span>
            </div>

            {/* Network Status Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                syncStats.isOnline 
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                  : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              }`}
              title={syncStats.isOnline ? 'Internet connection active' : 'No internet. Working 100% offline seamlessly.'}
            >
              {syncStats.isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Central Cloud Sync Status & Action */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5">
              <button
                onClick={handleManualSync}
                disabled={syncStats.isSyncing || !syncStats.isOnline}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-200 hover:text-white hover:bg-slate-700/60 rounded disabled:opacity-50 transition-all"
                title={
                  syncStats.pendingCount > 0 
                    ? `${syncStats.pendingCount} records waiting to sync to central cloud` 
                    : 'All records are up to date'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${syncStats.isSyncing ? 'animate-spin text-teal-300' : ''}`} />
                <span className="hidden md:inline">
                  {syncStats.isSyncing ? 'Syncing...' : 'Central Sync'}
                </span>
                {syncStats.pendingCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                    {syncStats.pendingCount}
                  </span>
                )}
                {syncStats.pendingCount === 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                    Synced
                  </span>
                )}
              </button>
            </div>

            {/* User Session Button */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <span className="font-semibold text-slate-200">
                  {user.role === 'owner' ? 'Owner' : `Tech (${user.username})`}
                </span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-red-400 p-0.5 ml-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
