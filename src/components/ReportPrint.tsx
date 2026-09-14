import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Printer, 
  ArrowLeft,
  Activity,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { db } from '../db/index';
import { PatientTrendGraph } from './PatientTrendGraph';

interface ReportPrintProps {
  orderId: string;
  onBack: () => void;
}

export const ReportPrint: React.FC<ReportPrintProps> = ({ orderId, onBack }) => {
  const order = useLiveQuery(() => db.orders.get(orderId), [orderId]);
  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);
  const [includeTrendGraph, setIncludeTrendGraph] = useState(false);

  const handlePrint = async () => {
    if (order && order.overallStatus !== 'printed') {
      await db.orders.update(order.id, {
        overallStatus: 'printed',
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
    }
    window.print();
  };

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center font-sans">
        <p className="text-slate-600 font-medium">Loading report data...</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 font-sans">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3 no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </button>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            <input
              type="checkbox"
              checked={includeTrendGraph}
              onChange={(e) => setIncludeTrendGraph(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>Include Historical Trend Graph</span>
          </label>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Lab Report (A4)</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document (A4 Container) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-md rounded-2xl print:shadow-none print:p-0 print:m-0 border border-slate-200 print:border-none text-slate-900 font-sans">
        
        {/* Lab Header - DIVINE LABORATORY */}
        <header className="border-b-2 border-teal-800 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Activity className="w-7 h-7 text-teal-700" />
                <h1 className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight uppercase font-sans">
                  {settings?.labName || 'DIVINE LABORATORY'}
                </h1>
              </div>
              <p className="text-xs font-bold text-teal-700 mt-0.5 tracking-wide">
                {settings?.tagline || 'Fully Automated Clinical Diagnostic Laboratory'}
              </p>

              {/* Two Branches Addresses */}
              <div className="text-[11px] text-slate-600 mt-2 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span>
                    <strong className="text-slate-800 font-bold">Branch 1:</strong> Koottummugham, Sreekandapuram <span className="font-manjari text-slate-700 font-medium">(കൂട്ടുമ്മുഖം, ശ്രീകണ്ഠപുരം)</span>
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-800 font-bold">Branch 2:</strong> Chandanakkampara, Payyavoor <span className="font-manjari text-slate-700 font-medium">(ചന്ദനക്കാംപാറ, പയ്യാവൂർ)</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-500">
                  <span>Phone: <strong className="text-slate-700 font-semibold">{settings?.phone || '+91 94470 12345 / +91 94470 67890'}</strong></span>
                  <span>•</span>
                  <span>Email: {settings?.email || 'divinelaboratory.kerala@gmail.com'}</span>
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
              <span className="inline-block bg-teal-50 text-teal-900 text-[10px] font-extrabold px-2.5 py-1 rounded border border-teal-200 uppercase tracking-wider">
                ISO 9001:2015 CERTIFIED
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Reg No: <strong className="text-slate-800">{settings?.regNo || 'KL/KNR/LAB/2026/042'}</strong>
              </p>
              <div className="mt-1 text-[10px] text-slate-400 font-mono">
                Branch: [{order.branchCode}]
              </div>
            </div>
          </div>
        </header>

        {/* Patient Demographics Box */}
        <section className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 print:bg-slate-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
            <div>
              <span className="text-slate-500 block text-[11px]">Patient Name:</span>
              <strong className="text-sm text-slate-900 font-extrabold uppercase">{order.patientName}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Patient ID:</span>
              <strong className="font-mono text-slate-800">{order.patientId}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Age / Gender:</span>
              <strong className="text-slate-800 font-bold">{order.patientAge} {order.patientAgeUnit} / {order.patientGender}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Phone Number:</span>
              <strong className="text-slate-800">{order.patientPhone || '—'}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Referred By:</span>
              <strong className="text-teal-900 font-bold">{order.referralDoctor}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Report / Lab ID:</span>
              <strong className="font-mono text-slate-800">{order.id}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Date &amp; Time:</span>
              <strong className="text-slate-800">{order.orderDate} {order.orderTime}</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Status:</span>
              <span className="font-extrabold text-emerald-700 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified &amp; Released
              </span>
            </div>
          </div>
        </section>

        {/* Diagnostic Results Section */}
        <section className="space-y-6">
          {order.tests.map((test) => {
            return (
              <div key={test.testId} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                {/* Test Title Header */}
                <div className="bg-teal-900 text-white px-4 py-2 flex justify-between items-center print:bg-teal-900 print:text-white">
                  <h3 className="font-bold text-sm tracking-wide uppercase">
                    {test.testName} ({test.testCode})
                  </h3>
                  <span className="text-[11px] text-teal-200">
                    Sample: {test.sampleType}
                  </span>
                </div>

                {/* Parameters Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Test Investigation</th>
                      <th className="py-2.5 px-3 w-40 text-center">Observed Result</th>
                      <th className="py-2.5 px-3 w-28 text-center">Unit</th>
                      <th className="py-2.5 px-3 w-48 text-center">Reference Interval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(test.results).map(([pId, r]) => {
                      const isHigh = r.flag === 'high';
                      const isLow = r.flag === 'low';
                      const isAbnormal = isHigh || isLow || r.flag === 'abnormal';

                      return (
                        <tr 
                          key={pId} 
                          className={isAbnormal ? 'bg-red-50/40 print:bg-transparent' : ''}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {r.parameterName}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block font-extrabold text-xs ${
                              isHigh 
                                ? 'text-red-700 print:text-black print:underline' 
                                : isLow 
                                ? 'text-amber-800 print:text-black print:underline' 
                                : 'text-slate-900'
                            }`}>
                              {r.value || 'Not tested'}
                              {isHigh && <span className="ml-1 text-[10px] font-black text-red-600 print:text-black">(HIGH)</span>}
                              {isLow && <span className="ml-1 text-[10px] font-black text-amber-700 print:text-black">(LOW)</span>}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                            {r.unit || '—'}
                          </td>

                          <td className="py-2.5 px-3 text-center text-slate-600 text-[11px] font-medium">
                            {r.normalRange || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {test.notes && (
                  <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-t border-slate-200">
                    <strong>Interpretation &amp; Clinical Notes:</strong> {test.notes}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Optional Embedded Trend Graph on Printed Report */}
        {includeTrendGraph && (
          <section className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
              Patient Historical Health Progression Graph
            </h4>
            <PatientTrendGraph
              patientId={order.patientId}
              patientPhone={order.patientPhone}
              patientName={order.patientName}
              compact={true}
            />
          </section>
        )}

        {/* End of Report Disclaimer */}
        <div className="text-center my-6 text-[10px] text-slate-400 uppercase tracking-widest">
          *** End of Medical Examination Report • DIVINE LABORATORY ***
        </div>

        {/* Doctor & Pathologist Signatures */}
        <footer className="mt-10 pt-6 border-t-2 border-slate-300">
          <div className="flex justify-between items-end text-xs">
            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold text-slate-800">{settings?.technicianName || 'Medical Lab Technologist (DMLT)'}</p>
              <p className="text-[11px] text-slate-500">Prepared &amp; Verified By</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center text-[9px] text-slate-400 mx-auto mb-1">
                <span>DIVINE LAB</span>
                <span>SEAL</span>
              </div>
            </div>

            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold text-teal-900">{settings?.pathologistName || 'Dr. K. V. Joseph, M.D.'}</p>
              <p className="text-[11px] text-slate-600">{settings?.pathologistDegree || 'Consultant Pathologist'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
            <span>Divine Laboratory • Koottummugham (Sreekandapuram) &amp; Chandanakkampara (Payyavoor)</span>
            <span>Printed: {new Date().toLocaleString()}</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
