import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Activity, 
  CheckCircle2, 
  Printer, 
  Save, 
  Search
} from 'lucide-react';
import { db } from '../db/index';
import type { TestOrder, ResultFlag } from '../types/lab';

interface ResultEntryProps {
  initialOrderId?: string | null;
  onPreviewReport: (orderId: string) => void;
  onBackToRecords: () => void;
}

export const ResultEntry: React.FC<ResultEntryProps> = ({
  initialOrderId,
  onPreviewReport,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId || null);
  const [searchOrderQuery, setSearchOrderQuery] = useState('');

  const orders = useLiveQuery(
    () => db.orders.orderBy('createdAt').reverse().limit(100).toArray(),
    []
  ) || [];

  const currentOrder = orders.find(o => o.id === selectedOrderId);

  const [orderResults, setOrderResults] = useState<TestOrder | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentOrder) {
      setOrderResults(JSON.parse(JSON.stringify(currentOrder)));
      setIsSaved(false);
    }
  }, [currentOrder?.id]);

  const calculateFlag = (
    valStr: string,
    min?: number,
    max?: number
  ): ResultFlag => {
    const trimmed = valStr.trim();
    if (!trimmed) return 'none';

    const lower = trimmed.toLowerCase();
    if (lower.includes('positive') || lower.includes('reactive') || lower.includes('1+') || lower.includes('2+') || lower.includes('3+')) {
      return 'high';
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (min !== undefined && num < min) return 'low';
      if (max !== undefined && num > max) return 'high';
      if (min !== undefined && max !== undefined) return 'normal';
    }

    return 'none';
  };

  const handleValueChange = (testIndex: number, paramId: string, value: string) => {
    if (!orderResults) return;

    const updated = { ...orderResults };
    const test = updated.tests[testIndex];
    if (!test) return;

    const existing = test.results[paramId] || {
      parameterId: paramId,
      parameterName: '',
      value: '',
      unit: '',
      normalRange: '',
      flag: 'none',
    };

    const flag = calculateFlag(value);

    test.results[paramId] = {
      ...existing,
      value,
      flag,
    };

    setOrderResults(updated);
    setIsSaved(false);
  };

  const handleFlagChange = (testIndex: number, paramId: string, flag: ResultFlag) => {
    if (!orderResults) return;
    const updated = { ...orderResults };
    const test = updated.tests[testIndex];
    if (!test || !test.results[paramId]) return;

    test.results[paramId].flag = flag;
    setOrderResults(updated);
    setIsSaved(false);
  };

  const handleNotesChange = (testIndex: number, notes: string) => {
    if (!orderResults) return;
    const updated = { ...orderResults };
    if (updated.tests[testIndex]) {
      updated.tests[testIndex].notes = notes;
      setOrderResults(updated);
      setIsSaved(false);
    }
  };

  const saveResults = async (andPrint: boolean = false) => {
    if (!orderResults) return;

    try {
      orderResults.tests.forEach(t => {
        const hasValues = Object.values(t.results).some(r => r.value && r.value.trim() !== '');
        if (hasValues) {
          t.status = 'completed';
        }
      });

      const allCompleted = orderResults.tests.every(t => t.status === 'completed');
      orderResults.overallStatus = allCompleted ? 'completed' : 'in_progress';
      orderResults.updatedAt = new Date().toISOString();
      orderResults.syncStatus = 'pending';

      await db.orders.put(orderResults);
      setIsSaved(true);

      if (andPrint) {
        onPreviewReport(orderResults.id);
      }
    } catch (err) {
      console.error('Failed to save results:', err);
      alert('Could not save test results to local database.');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.patientName.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
    o.patientPhone.includes(searchOrderQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" />
            Medical Test Result Entry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter test values • Automatic High/Low abnormal alerts • Instant offline save
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {orderResults && (
            <>
              <button
                onClick={() => saveResults(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Results</span>
              </button>

              <button
                onClick={() => saveResults(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-teal-400" />
                <span>Save &amp; Print Report</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Order Picker (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
              <span>Select Patient / Order</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {filteredOrders.length}
              </span>
            </h3>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, ID or phone..."
                value={searchOrderQuery}
                onChange={(e) => setSearchOrderQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No orders found. Book a patient first.
                </div>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = order.id === selectedOrderId;
                  const isCompleted = order.overallStatus === 'completed' || order.overallStatus === 'printed';

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setActiveTestIndex(0);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-teal-600 bg-teal-50/70 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-slate-900">
                          {order.patientName}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCompleted ? 'Completed' : 'Pending Results'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                        <span>{order.patientAge} {order.patientAgeUnit} • {order.patientGender}</span>
                        <span>{order.orderDate}</span>
                      </div>

                      <div className="text-[11px] text-teal-800 font-medium mt-1 truncate">
                        Tests: {order.tests.map(t => t.testCode).join(', ')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Results Input Form (8 cols) */}
        <div className="lg:col-span-8">
          {!orderResults ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">No Patient Order Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a patient from the left list to input test results.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Banner */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                    {orderResults.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {orderResults.patientName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ID: <span className="font-mono text-slate-700">{orderResults.patientId}</span> • {orderResults.patientAge} {orderResults.patientAgeUnit} • {orderResults.patientGender}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 text-right">
                  <p>Ref: <span className="font-semibold text-slate-800">{orderResults.referralDoctor}</span></p>
                  <p className="text-slate-400">{orderResults.orderDate} at {orderResults.orderTime}</p>
                </div>
              </div>

              {/* Test Tabs */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
                  {orderResults.tests.map((test, idx) => {
                    const isActive = activeTestIndex === idx;
                    const hasValues = Object.values(test.results).some(r => r.value && r.value.trim() !== '');

                    return (
                      <button
                        key={test.testId}
                        onClick={() => setActiveTestIndex(idx)}
                        className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                          isActive 
                            ? 'border-teal-600 text-teal-700 bg-white shadow-sm' 
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`}
                      >
                        <span>{test.testName}</span>
                        {hasValues && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Test Form */}
                {orderResults.tests[activeTestIndex] && (
                  <div className="p-5 space-y-6">
                    <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-100">
                      <span>Sample: <strong className="text-slate-700">{orderResults.tests[activeTestIndex].sampleType}</strong></span>
                      <span>Category: <strong className="text-slate-700">{orderResults.tests[activeTestIndex].category}</strong></span>
                    </div>

                    {/* Parameters Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
                            <th className="py-2.5 px-2 font-semibold">Test Parameter</th>
                            <th className="py-2.5 px-2 font-semibold w-44">Observed Value</th>
                            <th className="py-2.5 px-2 font-semibold w-24">Unit</th>
                            <th className="py-2.5 px-2 font-semibold w-40">Biological Reference</th>
                            <th className="py-2.5 px-2 font-semibold w-24">Alert Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(orderResults.tests[activeTestIndex].results).map(([pId, param]) => {
                            return (
                              <tr key={pId} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-2 font-medium text-slate-800">
                                  {param.parameterName}
                                </td>

                                <td className="py-3 px-2">
                                  <input
                                    type="text"
                                    value={param.value}
                                    placeholder="Enter value"
                                    onChange={(e) => handleValueChange(activeTestIndex, pId, e.target.value)}
                                    className={`w-full px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                                      param.flag === 'high'
                                        ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                        : param.flag === 'low'
                                        ? 'border-amber-400 bg-amber-50 text-amber-800 focus:ring-amber-400'
                                        : param.flag === 'normal'
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                                        : 'border-slate-300 focus:ring-teal-500 text-slate-900'
                                    }`}
                                  />
                                </td>

                                <td className="py-3 px-2 text-slate-500 text-xs font-mono">
                                  {param.unit || '—'}
                                </td>

                                <td className="py-3 px-2 text-slate-600 text-xs">
                                  {param.normalRange || '—'}
                                </td>

                                <td className="py-3 px-2">
                                  <select
                                    value={param.flag}
                                    onChange={(e) => handleFlagChange(activeTestIndex, pId, e.target.value as ResultFlag)}
                                    className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                                      param.flag === 'high'
                                        ? 'bg-red-100 text-red-800 border-red-300'
                                        : param.flag === 'low'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : param.flag === 'normal'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    <option value="none">Normal</option>
                                    <option value="normal">Normal ✓</option>
                                    <option value="high">HIGH ↑</option>
                                    <option value="low">LOW ↓</option>
                                    <option value="abnormal">Abnormal</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Interpretation / Remarks */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Pathologist Remarks / Notes for this test (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={orderResults.tests[activeTestIndex].notes || ''}
                        onChange={(e) => handleNotesChange(activeTestIndex, e.target.value)}
                        placeholder="e.g. Microcytic hypochromic blood picture noted. Correlate clinically."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Save Row */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isSaved && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Saved locally
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveResults(false)}
                      className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm"
                    >
                      Save Progress
                    </button>
                    <button
                      onClick={() => saveResults(true)}
                      className="px-5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      Generate &amp; Print Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
