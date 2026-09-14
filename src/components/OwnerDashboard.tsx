import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart3, 
  Users, 
  IndianRupee, 
  Calendar, 
  CreditCard, 
  Wallet,
  Building2,
  Server,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { db } from '../db/index';
import { useAuth } from '../context/AuthContext';

export const OwnerDashboard: React.FC = () => {
  const { user, availableBranches } = useAuth();
  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);
  const allOrders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const allPatients = useLiveQuery(() => db.patients.toArray(), []) || [];

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);


  // Orders scoped by selected branch
  const scopedOrders = useMemo(() => {
    if (selectedBranchId === 'all') return allOrders;
    return allOrders.filter(o => o.branchId === selectedBranchId);
  }, [allOrders, selectedBranchId]);

  const todayOrders = useMemo(() => {
    return scopedOrders.filter(o => o.orderDate === todayStr);
  }, [scopedOrders, todayStr]);

  const todayRevenue = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  }, [todayOrders]);

  const todayCash = useMemo(() => {
    return todayOrders.filter(o => o.paymentMode === 'Cash').reduce((sum, o) => sum + o.paidAmount, 0);
  }, [todayOrders]);

  const todayUpi = useMemo(() => {
    return todayOrders.filter(o => o.paymentMode === 'UPI / Online').reduce((sum, o) => sum + o.paidAmount, 0);
  }, [todayOrders]);

  const todayDue = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + o.balanceAmount, 0);
  }, [todayOrders]);

  const lifetimeRevenue = useMemo(() => {
    return scopedOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  }, [scopedOrders]);

  // Branch by branch comparison
  const branchComparison = useMemo(() => {
    return availableBranches.map(branch => {
      const bOrders = allOrders.filter(o => o.branchId === branch.id);
      const bTodayOrders = bOrders.filter(o => o.orderDate === todayStr);
      const bTodayRevenue = bTodayOrders.reduce((sum, o) => sum + o.paidAmount, 0);
      const bTodayCash = bTodayOrders.filter(o => o.paymentMode === 'Cash').reduce((sum, o) => sum + o.paidAmount, 0);
      const bTodayUpi = bTodayOrders.filter(o => o.paymentMode === 'UPI / Online').reduce((sum, o) => sum + o.paidAmount, 0);

      return {
        branch,
        todayPatients: bTodayOrders.length,
        todayRevenue: bTodayRevenue,
        todayCash: bTodayCash,
        todayUpi: bTodayUpi,
        totalLifetimeOrders: bOrders.length,
      };
    });
  }, [availableBranches, allOrders, todayStr]);

  const currency = settings?.currencySymbol || '₹';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Title & Branch Switcher */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            Centralized Multi-Branch Owner Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-branch visibility • Daily 200+ patient volume • Financial auditor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-semibold text-slate-700">Filter View:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-teal-800 focus:outline-none cursor-pointer"
            >
              <option value="all">🌟 All Branches (Consolidated)</option>
              {availableBranches.map(b => (
                <option key={b.id} value={b.id}>
                  🏥 [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-teal-50 text-teal-800 px-3 py-1.5 rounded-xl border border-teal-200 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Today: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
        </div>
      </div>

      {/* Target Progress Bar (200 Patients/Day Scale) */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 rounded-2xl shadow-md mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div>
            <span className="text-xs text-teal-300 uppercase font-bold tracking-wider">
              Daily Patient Throughput Tracker (Goal: 200 Patients/Day)
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-0.5">
              {todayOrders.length} <span className="text-sm font-normal text-slate-300">/ 200 Patients Registered Today</span>
            </h3>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-300">Target Progress</span>
            <div className="text-lg font-bold text-emerald-400">
              {Math.min(100, Math.round((todayOrders.length / 200) * 100))}% Achieved
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div 
            className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (todayOrders.length / 200) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Today's Key Metrics */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        {selectedBranchId === 'all' ? 'Consolidated Collections (All Branches)' : 'Branch Financial Performance'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Patients Today</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{todayOrders.length}</p>
          <span className="text-[11px] text-teal-600 font-medium">
            Across {selectedBranchId === 'all' ? `${availableBranches.length} branches` : 'selected branch'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Today&apos;s Collection</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{currency}{todayRevenue}</p>
          <span className="text-[11px] text-slate-400 font-medium">Cash + UPI Total</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Physical Cash Drawer</span>
            <Wallet className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{currency}{todayCash}</p>
          <span className="text-[11px] text-slate-400 font-medium">In branch cash registers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold">Online / UPI Collection</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-700">{currency}{todayUpi}</p>
          <span className="text-[11px] text-slate-400 font-medium">Bank QR payments</span>
        </div>
      </div>

      {/* Lifetime and Due Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <span className="text-slate-600">Pending Patient Due / Credit:</span>
          <strong className="text-amber-700 font-bold text-sm">{currency}{todayDue}</strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <span className="text-slate-600">All-Time Cumulative Revenue:</span>
          <strong className="text-teal-800 font-bold text-sm">{currency}{lifetimeRevenue}</strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <span className="text-slate-600">Total Registered Patients:</span>
          <strong className="text-slate-900 font-bold text-sm">{allPatients.length} Patients</strong>
        </div>
      </div>

      {/* Side-by-Side Branch Comparison Grid */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-600" />
          Live Branch-by-Branch Comparison
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branchComparison.map(({ branch, todayPatients, todayRevenue, todayCash, todayUpi, totalLifetimeOrders }) => (
            <div 
              key={branch.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                selectedBranchId === branch.id 
                  ? 'border-teal-500 ring-2 ring-teal-500/20' 
                  : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                    {branch.code}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mt-1">
                    {branch.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{branch.address}</p>
                </div>

                <button
                  onClick={() => setSelectedBranchId(branch.id)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
                >
                  <span>Focus Branch</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center my-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Today Patients</span>
                  <strong className="text-lg text-slate-900 font-bold">{todayPatients}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Today Cash</span>
                  <strong className="text-sm text-slate-800 font-bold">{currency}{todayCash}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Today UPI</span>
                  <strong className="text-sm text-blue-700 font-bold">{currency}{todayUpi}</strong>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="text-slate-500">Today Total: <strong className="text-emerald-700 font-bold text-sm">{currency}{todayRevenue}</strong></span>
                <span className="text-slate-400">Total Visits: {totalLifetimeOrders}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Central Server & Security Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Server className="w-4 h-4 text-teal-600" />
          Central Backend Server &amp; Security Status
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Node.js central API gateway running with JWT authentication, bcrypt encryption, and branch isolation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-500 block">Gateway Endpoint:</span>
            <strong className="font-mono text-slate-800">http://localhost:5000</strong>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-500 block">Current User:</span>
            <strong className="text-slate-800">{user?.fullName || 'Not Logged In (Guest View)'}</strong>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-500 block">Active Branches:</span>
            <strong className="text-emerald-700 font-bold">{availableBranches.length} Branches Registered</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
