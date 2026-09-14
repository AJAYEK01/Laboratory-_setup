import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Clock, 
  Search, 
  Calendar, 
  Printer, 
  Trash2,
  Filter
} from 'lucide-react';
import { db } from '../db/index';

interface RecordsListProps {
  onSelectOrderForResults: (orderId: string) => void;
  onSelectOrderForPrint: (orderId: string) => void;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  onSelectOrderForResults,
  onSelectOrderForPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);
  const allOrders = useLiveQuery(() => db.orders.orderBy('createdAt').reverse().toArray(), []) || [];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = order.orderDate === todayStr;
      } else if (dateFilter === 'yesterday') {
        matchesDate = order.orderDate === yesterdayStr;
      } else if (dateFilter === 'week') {
        matchesDate = order.orderDate >= sevenDaysAgoStr;
      } else if (dateFilter === 'month') {
        matchesDate = order.orderDate.startsWith(currentMonthStr);
      } else if (dateFilter === 'custom') {
        matchesDate = order.orderDate === customDate;
      }

      if (!matchesDate) return false;

      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && order.overallStatus !== 'completed' && order.overallStatus !== 'printed') return false;
        if (statusFilter === 'pending' && (order.overallStatus === 'completed' || order.overallStatus === 'printed')) return false;
        if (statusFilter === 'printed' && order.overallStatus !== 'printed') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = order.patientName.toLowerCase().includes(q);
        const matchesPhone = order.patientPhone.includes(q);
        const matchesId = order.id.toLowerCase().includes(q) || order.patientId.toLowerCase().includes(q);
        const matchesDoc = order.referralDoctor.toLowerCase().includes(q);
        const matchesTest = order.tests.some(t => t.testName.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q));

        return matchesName || matchesPhone || matchesId || matchesDoc || matchesTest;
      }

      return true;
    });
  }, [allOrders, dateFilter, customDate, statusFilter, searchQuery, todayStr, yesterdayStr, sevenDaysAgoStr, currentMonthStr]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => acc + curr.paidAmount, 0);
  }, [filteredOrders]);

  const completedCount = useMemo(() => {
    return filteredOrders.filter(o => o.overallStatus === 'completed' || o.overallStatus === 'printed').length;
  }, [filteredOrders]);

  const handleDelete = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this patient record?')) {
      await db.orders.delete(orderId);
    }
  };

  const currency = settings?.currencySymbol || '₹';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-600" />
            Patient Records &amp; Past History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Stored permanently on local disk • Access any previous day&apos;s records with or without internet
          </p>
        </div>

        {/* Date Filters Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'today' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'yesterday' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'week' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'month' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All History
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dateFilter === 'custom' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Custom Date
          </button>
        </div>
      </div>

      {/* Custom Date Input Bar (if selected) */}
      {dateFilter === 'custom' && (
        <div className="mb-4 bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-teal-700" />
          <span className="font-semibold text-teal-900">Select Any Previous Date:</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="px-3 py-1 rounded-lg border border-teal-300 font-medium text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-teal-700 font-medium">
            (Showing records for: {new Date(customDate).toLocaleDateString(undefined, { dateStyle: 'full' })})
          </span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Patient Visits</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{filteredOrders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
            {filteredOrders.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Reports Completed</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{completedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            {completedCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Collection</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{currency}{totalRevenue}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
            {currency}
          </div>
        </div>
      </div>

      {/* Search & Status Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search patient name, mobile, test or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed / Ready to Print</option>
            <option value="pending">Pending Test Results</option>
            <option value="printed">Already Printed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Patient Name &amp; Info</th>
                <th className="py-3 px-4 font-semibold">Doctor Ref</th>
                <th className="py-3 px-4 font-semibold">Booked Tests</th>
                <th className="py-3 px-4 font-semibold">Bill / Paid</th>
                <th className="py-3 px-4 font-semibold">Report Status</th>
                <th className="py-3 px-4 font-semibold">Cloud Sync</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No patient records found for the selected filter or search term.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isSynced = order.syncStatus === 'synced';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">{order.orderDate}</div>
                        <div className="text-[11px] text-slate-400">{order.orderTime}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{order.patientName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>{order.patientAge} {order.patientAgeUnit}</span>
                          <span>•</span>
                          <span>{order.patientGender}</span>
                          {order.patientPhone && (
                            <>
                              <span>•</span>
                              <span>{order.patientPhone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {order.referralDoctor}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {order.tests.map(t => (
                            <span 
                              key={t.testId} 
                              className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                            >
                              {t.testCode}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">
                          {currency}{order.finalAmount}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          order.paymentStatus === 'paid' 
                            ? 'text-emerald-700' 
                            : 'text-amber-700'
                        }`}>
                          {order.paymentStatus.toUpperCase()} ({order.paymentMode})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          order.overallStatus === 'printed'
                            ? 'bg-purple-100 text-purple-800'
                            : order.overallStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.overallStatus === 'printed' ? 'Printed' : order.overallStatus === 'completed' ? 'Completed' : 'Pending Results'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          isSynced ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isSynced ? 'Synced' : 'Local Only'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => onSelectOrderForResults(order.id)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded-lg text-xs transition-colors"
                          title="Enter or update test results"
                        >
                          Results
                        </button>

                        <button
                          onClick={() => onSelectOrderForPrint(order.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                          title="Preview and print lab report"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Report</span>
                        </button>

                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
