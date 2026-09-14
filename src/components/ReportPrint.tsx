import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Printer, 
  ArrowLeft
} from 'lucide-react';
import { db } from '../db/index';

interface ReportPrintProps {
  orderId: string;
  onBack: () => void;
}

export const ReportPrint: React.FC<ReportPrintProps> = ({ orderId, onBack }) => {
  const order = useLiveQuery(() => db.orders.get(orderId), [orderId]);
  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);

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
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center">
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
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3 no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Lab Report (A4)</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document (A4 Container) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-md rounded-xl print:shadow-none print:p-0 print:m-0 border border-slate-200 print:border-none text-slate-900 font-sans">
        
        {/* Lab Header */}
        <header className="border-b-2 border-teal-700 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-teal-800 tracking-tight uppercase">
                {settings?.labName || 'Aarogya Diagnostic Centre'}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                {settings?.tagline || 'Clinical Laboratory & Pathology Center'}
              </p>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>
                  <span>{settings?.address || 'Main Road, Tehsil HQ'}</span>
                </p>
                <p className="flex items-center gap-3">
                  <span>Phone: <strong className="text-slate-700">{settings?.phone || '9876543210'}</strong></span>
                  <span>•</span>
                  <span>Email: {settings?.email || 'lab@example.com'}</span>
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
              <span className="inline-block bg-teal-50 text-teal-800 text-[11px] font-bold px-2.5 py-1 rounded border border-teal-200 uppercase tracking-wider">
                ISO 9001:2015
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Govt Reg No: <strong className="text-slate-700">{settings?.regNo || 'LAB/2026/8942'}</strong>
              </p>
            </div>
          </div>
        </header>

        {/* Patient Demographics Box */}
        <section className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 print:bg-slate-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <strong className="text-sm text-slate-900 font-bold uppercase">{order.patientName}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Patient ID:</span>
              <strong className="font-mono text-slate-800">{order.patientId}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Age / Gender:</span>
              <strong className="text-slate-800">{order.patientAge} {order.patientAgeUnit} / {order.patientGender}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Contact Phone:</span>
              <strong className="text-slate-800">{order.patientPhone || '—'}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Referred By:</span>
              <strong className="text-teal-900 font-semibold">{order.referralDoctor}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Order Ref:</span>
              <strong className="font-mono text-slate-800">{order.id}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Date &amp; Time:</span>
              <strong className="text-slate-800">{order.orderDate} {order.orderTime}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Status:</span>
              <span className="font-bold text-emerald-700 uppercase">Verified &amp; Approved</span>
            </div>
          </div>
        </section>

        {/* Diagnostic Results Section */}
        <section className="space-y-6">
          {order.tests.map((test) => {
            return (
              <div key={test.testId} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                {/* Test Title Header */}
                <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center print:bg-slate-800 print:text-white">
                  <h3 className="font-bold text-sm tracking-wide uppercase">
                    {test.testName} ({test.testCode})
                  </h3>
                  <span className="text-[11px] text-slate-300">
                    Sample: {test.sampleType}
                  </span>
                </div>

                {/* Parameters Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-3">Test Investigation</th>
                      <th className="py-2 px-3 w-40 text-center">Observed Result</th>
                      <th className="py-2 px-3 w-28 text-center">Unit</th>
                      <th className="py-2 px-3 w-48 text-center">Reference Interval</th>
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
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {r.parameterName}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block font-bold text-xs ${
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

                          <td className="py-2 px-3 text-center text-slate-600 font-mono text-[11px]">
                            {r.unit || '—'}
                          </td>

                          <td className="py-2 px-3 text-center text-slate-600 text-[11px]">
                            {r.normalRange || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {test.notes && (
                  <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-t border-slate-200">
                    <strong>Interpretation &amp; Remarks:</strong> {test.notes}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* End of Report Disclaimer */}
        <div className="text-center my-6 text-[10px] text-slate-400 uppercase tracking-widest">
          *** End of Medical Examination Report ***
        </div>

        {/* Doctor & Pathologist Signatures */}
        <footer className="mt-12 pt-6 border-t-2 border-slate-300">
          <div className="flex justify-between items-end text-xs">
            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold text-slate-800">{settings?.technicianName || 'Medical Lab Technologist'}</p>
              <p className="text-[11px] text-slate-500">Prepared &amp; Verified By</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-[10px] text-slate-400 mx-auto mb-1">
                Official Seal
              </div>
            </div>

            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold text-teal-900">{settings?.pathologistName || 'Dr. Anand M. Patel, M.D.'}</p>
              <p className="text-[11px] text-slate-600">{settings?.pathologistDegree || 'Consultant Pathologist'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
            <span>This is a computer-generated diagnostic lab report.</span>
            <span>Printed on: {new Date().toLocaleString()}</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
